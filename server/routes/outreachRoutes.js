const express = require('express');
const router = express.Router();
const { getDomain } = require('tldts');
const Outreach = require('../models/Outreach');
const Project = require('../models/Project');
const Backlink = require('../models/Backlink');
const { getMetricsProvider } = require('../providers');
const { authenticateToken } = require('../utils/auth');
const { checkRootDomainDuplicate } = require('../utils/duplicateDetector');

// 1. POST /api/outreach — Create Outreach Record
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { projectId, site, contactEmail, pitchDate, followUpDate, notes, prospectId } = req.body;

    if (!projectId || !site) {
      return res.status(400).json({ error: 'Missing required fields: projectId, site' });
    }

    const project = await Project.findById(projectId);
    if (!project) {
      return res.status(404).json({ error: 'Referenced Project not found' });
    }

    const outreach = new Outreach({
      projectId,
      prospectId: prospectId || null,
      site,
      contactEmail: contactEmail || '',
      pitchDate: pitchDate ? new Date(pitchDate) : new Date(),
      followUpDate: followUpDate ? new Date(followUpDate) : null,
      status: 'no_reply',
      notes: notes || ''
    });

    await outreach.save();
    await outreach.populate([
      { path: 'projectId', select: 'businessName projectUrl' },
      { path: 'prospectId', select: 'site rootDomain' }
    ]);

    res.status(201).json({ message: 'Outreach pitch recorded successfully', outreach });
  } catch (err) {
    console.error('Create outreach error:', err);
    res.status(500).json({ error: 'Failed to create outreach record', details: err.message });
  }
});

// 2. GET /api/outreach — List Outreach Records
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { projectId, status } = req.query;

    const filter = {};
    if (projectId) filter.projectId = projectId;
    if (status) filter.status = status;

    const outreachRecords = await Outreach.find(filter)
      .populate('projectId', 'businessName projectUrl')
      .populate('prospectId', 'site rootDomain daSnapshot ssSnapshot')
      .populate('backlinkId')
      .sort({ createdAt: -1 });

    res.json({ outreachRecords });
  } catch (err) {
    console.error('List outreach error:', err);
    res.status(500).json({ error: 'Failed to fetch outreach records', details: err.message });
  }
});

// 3. PUT /api/outreach/:id — Update Outreach Record (with Auto-Backlink Creation on status = 'published')
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const { contactEmail, pitchDate, followUpDate, status, publishedUrl, notes } = req.body;
    const outreach = await Outreach.findById(req.params.id);

    if (!outreach) {
      return res.status(404).json({ error: 'Outreach record not found' });
    }

    const previousStatus = outreach.status;

    if (contactEmail !== undefined) outreach.contactEmail = contactEmail;
    if (pitchDate) outreach.pitchDate = new Date(pitchDate);
    if (followUpDate) outreach.followUpDate = new Date(followUpDate);
    if (notes !== undefined) outreach.notes = notes;
    if (publishedUrl !== undefined) outreach.publishedUrl = publishedUrl;

    let autoCreatedBacklink = null;

    // Check if status is transitioning to 'published'
    if (status && status !== previousStatus) {
      outreach.status = status;

      if (status === 'published' && !outreach.backlinkId) {
        const targetUrl = outreach.publishedUrl || (outreach.site.includes('://') ? outreach.site : `https://${outreach.site}`);

        // Shared Duplicate Detection Check against active backlinks for this project
        const dupCheck = await checkRootDomainDuplicate(outreach.projectId, targetUrl);
        const rootDomain = dupCheck.rootDomain;
        const duplicateFlag = dupCheck.duplicateFlag;
        const originalBacklinkId = dupCheck.originalBacklinkId;

        // Auto-check metrics via active MetricsProvider
        const provider = getMetricsProvider();
        const metrics = await provider.getDomainMetrics(rootDomain);

        const newBacklink = new Backlink({
          projectId: outreach.projectId,
          submittedBy: req.user.id,
          url: targetUrl,
          rootDomain,
          anchorText: outreach.notes ? `Outreach: ${outreach.notes.slice(0, 50)}` : 'Published Guest Post',
          targetPage: '/',
          status: 'live',
          duplicateFlag,
          originalBacklinkId,
          lastDa: metrics.authority_score,
          lastPa: metrics.page_score,
          lastSs: metrics.spam_score,
          notes: `Auto-created from published outreach record ID ${outreach._id}`
        });

        await newBacklink.save();
        outreach.backlinkId = newBacklink._id;
        autoCreatedBacklink = newBacklink;
      }
    }

    await outreach.save();
    await outreach.populate([
      { path: 'projectId', select: 'businessName projectUrl' },
      { path: 'prospectId', select: 'site rootDomain' },
      { path: 'backlinkId' }
    ]);

    res.json({
      message: status === 'published' && autoCreatedBacklink
        ? `Outreach status updated to 'published' — Auto-created Backlink #${autoCreatedBacklink._id}`
        : 'Outreach record updated successfully',
      outreach,
      autoCreatedBacklink
    });
  } catch (err) {
    console.error('Update outreach error:', err);
    res.status(500).json({ error: 'Failed to update outreach record', details: err.message });
  }
});

// 4. DELETE /api/outreach/:id — Delete Outreach Record
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const outreach = await Outreach.findByIdAndDelete(req.params.id);
    if (!outreach) {
      return res.status(404).json({ error: 'Outreach record not found' });
    }
    res.json({ message: 'Outreach record deleted successfully' });
  } catch (err) {
    console.error('Delete outreach error:', err);
    res.status(500).json({ error: 'Failed to delete outreach record', details: err.message });
  }
});

module.exports = router;
