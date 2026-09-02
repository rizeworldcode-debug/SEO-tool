const express = require('express');
const router = express.Router();
const { getDomain } = require('tldts');
const Prospect = require('../models/Prospect');
const Project = require('../models/Project');
const Outreach = require('../models/Outreach');
const { getMetricsProvider } = require('../providers');
const { authenticateToken } = require('../utils/auth');

// 1. POST /api/prospects — Add prospect with auto DA/PA/SS check via MetricsProvider
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { projectId, site, priority, notes } = req.body;

    if (!projectId || !site) {
      return res.status(400).json({ error: 'Missing required fields: projectId, site' });
    }

    const project = await Project.findById(projectId);
    if (!project) {
      return res.status(404).json({ error: 'Referenced Project not found' });
    }

    let parsedDomain;
    try {
      const u = new URL(site.includes('://') ? site : `https://${site}`);
      parsedDomain = getDomain(u.hostname) || u.hostname;
    } catch (e) {
      parsedDomain = getDomain(site) || site;
    }
    const cleanRootDomain = (parsedDomain || site).toLowerCase();

    // Auto-check DA/PA/SS via active MetricsProvider
    const provider = getMetricsProvider();
    const metrics = await provider.getDomainMetrics(cleanRootDomain);

    const prospect = new Prospect({
      projectId,
      site,
      rootDomain: cleanRootDomain,
      daSnapshot: metrics.authority_score,
      paSnapshot: metrics.page_score,
      ssSnapshot: metrics.spam_score,
      contactStatus: 'new',
      priority: priority || 'medium',
      notes: notes || ''
    });

    await prospect.save();
    await prospect.populate('projectId', 'businessName projectUrl');

    res.status(201).json({
      message: 'Prospect added successfully with auto metrics check',
      prospect,
      providerSource: metrics.source
    });
  } catch (err) {
    console.error('Add prospect error:', err);
    res.status(500).json({ error: 'Failed to add prospect', details: err.message });
  }
});

// 2. GET /api/prospects — List prospects with filtering and sorting
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { projectId, contactStatus, priority, sortBy, sortOrder } = req.query;

    const filter = {};
    if (projectId) filter.projectId = projectId;
    if (contactStatus) filter.contactStatus = contactStatus;
    if (priority) filter.priority = priority;

    let sort = { createdAt: -1 };
    if (sortBy === 'da') {
      sort = { daSnapshot: sortOrder === 'asc' ? 1 : -1 };
    } else if (sortBy === 'ss') {
      sort = { ssSnapshot: sortOrder === 'asc' ? 1 : -1 };
    } else if (sortBy === 'priority') {
      sort = { priority: sortOrder === 'asc' ? 1 : -1 };
    }

    const prospects = await Prospect.find(filter)
      .populate('projectId', 'businessName projectUrl')
      .sort(sort);

    res.json({ prospects });
  } catch (err) {
    console.error('List prospects error:', err);
    res.status(500).json({ error: 'Failed to fetch prospects', details: err.message });
  }
});

// 3. PUT /api/prospects/:id — Update prospect
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const { contactStatus, priority, notes } = req.body;
    const prospect = await Prospect.findById(req.params.id);

    if (!prospect) {
      return res.status(404).json({ error: 'Prospect not found' });
    }

    if (contactStatus) prospect.contactStatus = contactStatus;
    if (priority) prospect.priority = priority;
    if (notes !== undefined) prospect.notes = notes;

    await prospect.save();
    await prospect.populate('projectId', 'businessName projectUrl');

    res.json({ message: 'Prospect updated successfully', prospect });
  } catch (err) {
    console.error('Update prospect error:', err);
    res.status(500).json({ error: 'Failed to update prospect', details: err.message });
  }
});

// 4. POST /api/prospects/:id/promote-to-outreach — Promote Prospect to Outreach Record
router.post('/:id/promote-to-outreach', authenticateToken, async (req, res) => {
  try {
    const { contactEmail, notes } = req.body;
    const prospect = await Prospect.findById(req.params.id);

    if (!prospect) {
      return res.status(404).json({ error: 'Prospect not found' });
    }

    // Create corresponding Outreach record
    const outreach = new Outreach({
      projectId: prospect.projectId,
      prospectId: prospect._id,
      site: prospect.site,
      contactEmail: contactEmail || '',
      pitchDate: new Date(),
      status: 'no_reply',
      notes: notes || `Promoted from prospect '${prospect.site}'`
    });

    await outreach.save();

    // Update prospect contact status to 'contacted'
    prospect.contactStatus = 'contacted';
    await prospect.save();

    await outreach.populate([
      { path: 'projectId', select: 'businessName projectUrl' },
      { path: 'prospectId', select: 'site rootDomain daSnapshot ssSnapshot' }
    ]);

    res.status(201).json({
      message: `Prospect '${prospect.site}' promoted to Outreach record successfully!`,
      outreach,
      prospect
    });
  } catch (err) {
    console.error('Promote prospect error:', err);
    res.status(500).json({ error: 'Failed to promote prospect to outreach', details: err.message });
  }
});

// 5. DELETE /api/prospects/:id — Delete prospect
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const prospect = await Prospect.findByIdAndDelete(req.params.id);
    if (!prospect) {
      return res.status(404).json({ error: 'Prospect not found' });
    }
    res.json({ message: 'Prospect deleted successfully' });
  } catch (err) {
    console.error('Delete prospect error:', err);
    res.status(500).json({ error: 'Failed to delete prospect', details: err.message });
  }
});

module.exports = router;
