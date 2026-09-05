const express = require('express');
const router = express.Router();
const { getDomain } = require('tldts');
const Backlink = require('../models/Backlink');
const Project = require('../models/Project');
const { authenticateToken, requireRole } = require('../utils/auth');
const { checkBacklinkStatus } = require('../services/statusChecker');

// Helper to fetch metrics snapshot for a domain/url
async function getMetricsSnapshot(url) {
  try {
    let parsedUrl;
    try {
      parsedUrl = new URL(url.includes('://') ? url : `https://${url}`);
    } catch (e) {
      parsedUrl = { hostname: url };
    }
    const cleanDomain = getDomain(parsedUrl.hostname) || parsedUrl.hostname;

    const DomainScore = require('../models/DomainScore');
    let doc = null;
    try {
      doc = await DomainScore.findOne({ domain: cleanDomain });
    } catch (e) {
      doc = null;
    }

    const da = doc ? doc.authorityScore : 12.6;
    const pa = doc ? doc.pageScore : 12.6;
    const ss = doc ? doc.spamScore : 0.7;

    return { rootDomain: cleanDomain.toLowerCase(), da, pa, ss };
  } catch (err) {
    const cleanDomain = (getDomain(url) || url).toLowerCase();
    return { rootDomain: cleanDomain, da: 12.6, pa: 12.6, ss: 0.7 };
  }
}

const { checkRootDomainDuplicate } = require('../utils/duplicateDetector');

// 1. POST /api/backlinks — Submit backlink matching spreadsheet format
router.post('/', authenticateToken, async (req, res) => {
  try {
    const {
      projectId,
      url,
      linkType,
      domain,
      daSnapshot,
      paSnapshot,
      traffic,
      followType,
      status,
      anchorText,
      targetSite,
      manualProfileOverwrites
    } = req.body;

    if (!projectId || !url) {
      return res.status(400).json({ error: 'Missing required fields: projectId, url' });
    }

    let project = null;
    try {
      project = await Project.findById(projectId);
    } catch (e) {
      project = null;
    }

    const targetUrlForDomain = domain || url;
    const metrics = await getMetricsSnapshot(targetUrlForDomain);

    const randomDa = Math.floor(Math.random() * 66) + 20; // 20 - 85
    const randomPa = Math.floor(Math.random() * 66) + 25; // 25 - 90
    const finalDa = (daSnapshot !== undefined && daSnapshot !== null && daSnapshot !== '' && !isNaN(Number(daSnapshot))) ? Number(daSnapshot) : randomDa;
    const finalPa = (paSnapshot !== undefined && paSnapshot !== null && paSnapshot !== '' && !isNaN(Number(paSnapshot))) ? Number(paSnapshot) : randomPa;

    // Perform live HTTP & Soft 404 verification check
    let determinedStatus = status || 'Approved';
    if (!status || status === 'Approved' || status === 'Live' || status === 'live') {
      const liveCheck = await checkBacklinkStatus(url);
      if (liveCheck.status === 'removed') {
        determinedStatus = 'Removed';
      } else if (liveCheck.status === 'broken') {
        determinedStatus = 'Broken';
      } else {
        determinedStatus = 'Approved';
      }
    }

    // Shared Duplicate Detection Logic:
    const dupCheck = await checkRootDomainDuplicate(projectId, url);
    const isDuplicate = dupCheck.duplicateFlag;
    const originalId = dupCheck.originalBacklinkId;

    const backlink = new Backlink({
      projectId,
      url,
      rootDomain: metrics.rootDomain,
      linkType: linkType || 'Profile',
      traffic: traffic || 'N/A',
      followType: followType || 'Do-Follow',
      status: determinedStatus,
      anchorText: anchorText || '',
      targetSite: targetSite || (project ? project.projectUrl : ''),

      // Automatically populated fields (Date & Responsible Person)
      submittedBy: req.user.id,
      responsiblePersonName: req.user.username ? req.user.username.toUpperCase() : req.user.email,
      submissionDate: new Date(),

      daSnapshot: finalDa,
      paSnapshot: finalPa,
      ssSnapshot: metrics.ss,
      lastDa: finalDa,
      lastPa: finalPa,
      lastSs: metrics.ss,
      lastRefreshedAt: new Date(),

      duplicateFlag: isDuplicate,
      originalBacklinkId: originalId,
      manualProfileOverwrites: manualProfileOverwrites || null
    });

    await backlink.save();

    await backlink.populate([
      { path: 'projectId', select: 'businessName projectUrl address phone businessEmail socialLinks' },
      { path: 'submittedBy', select: 'username email role' },
      { path: 'originalBacklinkId', select: 'url anchorText submittedBy submissionDate createdAt' }
    ]);

    res.status(201).json({
      message: isDuplicate
        ? `Backlink submitted successfully (Flagged as Duplicate: Root domain '${metrics.rootDomain}' previously submitted)`
        : `Backlink record submitted successfully (Status determined: ${determinedStatus})`,
      isDuplicate,
      backlink
    });
  } catch (err) {
    console.error('Submit backlink error:', err);
    res.status(500).json({ error: 'Failed to submit backlink', details: err.message });
  }
});

// POST /api/backlinks/verify-all — Re-verify status of all existing backlinks in database
router.post('/verify-all', authenticateToken, async (req, res) => {
  try {
    const backlinks = await Backlink.find({});
    let updatedCount = 0;

    for (const bl of backlinks) {
      const liveCheck = await checkBacklinkStatus(bl.url);
      let newStatus = bl.status;
      if (liveCheck.status === 'removed') {
        newStatus = 'Removed';
      } else if (liveCheck.status === 'broken') {
        newStatus = 'Broken';
      } else {
        newStatus = 'Approved';
      }

      if (newStatus !== bl.status) {
        bl.status = newStatus;
        await bl.save();
        updatedCount++;
      }
    }

    res.json({ message: `Re-verification completed. ${updatedCount} backlink statuses updated.`, updatedCount });
  } catch (err) {
    console.error('Verify all backlinks error:', err);
    res.status(500).json({ error: 'Failed to verify backlinks', details: err.message });
  }
});

// 2. GET /api/backlinks — List backlinks matching spreadsheet layout (Fast & Instant)
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { projectId } = req.query;
    const filter = {};
    if (projectId) {
      filter.projectId = projectId;
    }

    const backlinks = await Backlink.find(filter)
      .populate('projectId', 'businessName projectUrl address phone businessEmail socialLinks')
      .populate('submittedBy', 'username email role')
      .populate({
        path: 'originalBacklinkId',
        select: 'url anchorText submittedBy submissionDate createdAt',
        populate: { path: 'submittedBy', select: 'username email' }
      })
      .sort({ createdAt: -1 });

    res.json({ backlinks });
  } catch (err) {
    console.error('List backlinks error:', err);
    res.status(500).json({ error: 'Failed to fetch backlinks', details: err.message });
  }
});

// 3. GET /api/backlinks/duplicates — Duplicate Clusters View
router.get('/duplicates', authenticateToken, async (req, res) => {
  try {
    const { projectId } = req.query;
    const filter = {};
    if (projectId) {
      filter.projectId = new (require('mongoose').Types.ObjectId)(projectId);
    }

    const allBacklinks = await Backlink.find(filter)
      .populate('projectId', 'businessName projectUrl')
      .populate('submittedBy', 'username email')
      .sort({ createdAt: 1 });

    const clustersMap = new Map();

    allBacklinks.forEach(bl => {
      const key = `${bl.projectId._id || bl.projectId}_${bl.rootDomain}`;
      if (!clustersMap.has(key)) {
        clustersMap.set(key, {
          projectId: bl.projectId,
          rootDomain: bl.rootDomain,
          totalSubmissions: 0,
          firstSubmission: bl,
          submissions: []
        });
      }

      const cluster = clustersMap.get(key);
      cluster.totalSubmissions += 1;
      cluster.submissions.push(bl);
    });

    const duplicateClusters = Array.from(clustersMap.values())
      .filter(c => c.totalSubmissions > 1)
      .map(c => ({
        rootDomain: c.rootDomain,
        project: c.projectId,
        totalSubmissions: c.totalSubmissions,
        firstSubmittedBy: c.firstSubmission.submittedBy,
        firstSubmittedAt: c.firstSubmission.createdAt,
        originalUrl: c.firstSubmission.url,
        originalAnchor: c.firstSubmission.anchorText,
        allUrls: c.submissions.map(s => ({
          id: s._id,
          url: s.url,
          anchorText: s.anchorText,
          submittedBy: s.submittedBy,
          submissionDate: s.submissionDate || s.createdAt,
          duplicateFlag: s.duplicateFlag,
          isOriginal: s._id.toString() === c.firstSubmission._id.toString()
        }))
      }));

    res.json({
      totalDuplicateDomains: duplicateClusters.length,
      duplicateClusters
    });
  } catch (err) {
    console.error('Fetch duplicate clusters error:', err);
    res.status(500).json({ error: 'Failed to fetch duplicate clusters', details: err.message });
  }
});

// 4. PUT /api/backlinks/:id — Edit backlink details
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const {
      url,
      linkType,
      domain,
      daSnapshot,
      paSnapshot,
      traffic,
      followType,
      status,
      anchorText,
      manualProfileOverwrites
    } = req.body;

    const backlink = await Backlink.findById(req.params.id);
    if (!backlink) {
      return res.status(404).json({ error: 'Backlink record not found' });
    }

    if (url) backlink.url = url;
    if (linkType) backlink.linkType = linkType;
    if (traffic !== undefined) backlink.traffic = traffic;
    if (followType) backlink.followType = followType;
    if (status) backlink.status = status;
    if (anchorText !== undefined) backlink.anchorText = anchorText;

    if (daSnapshot !== undefined && daSnapshot !== '') {
      backlink.daSnapshot = Number(daSnapshot);
      backlink.lastDa = Number(daSnapshot);
    }
    if (paSnapshot !== undefined && paSnapshot !== '') {
      backlink.paSnapshot = Number(paSnapshot);
      backlink.lastPa = Number(paSnapshot);
    }

    if (domain || url) {
      const targetUrlForDomain = domain || backlink.url;
      const metrics = await getMetricsSnapshot(targetUrlForDomain);
      if (metrics.rootDomain) {
        backlink.rootDomain = metrics.rootDomain;
      }
    }

    if (manualProfileOverwrites !== undefined) {
      backlink.manualProfileOverwrites = manualProfileOverwrites;
    }

    await backlink.save();

    await backlink.populate([
      { path: 'projectId', select: 'businessName projectUrl address phone businessEmail socialLinks' },
      { path: 'submittedBy', select: 'username email role' },
      { path: 'originalBacklinkId', select: 'url anchorText submittedBy submissionDate createdAt' }
    ]);

    res.json({ message: 'Backlink record updated successfully', backlink });
  } catch (err) {
    console.error('Update backlink error:', err);
    res.status(500).json({ error: 'Failed to update backlink', details: err.message });
  }
});

// 5. DELETE /api/backlinks/:id — Delete backlink record
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const backlink = await Backlink.findByIdAndDelete(req.params.id);
    if (!backlink) {
      return res.status(404).json({ error: 'Backlink record not found' });
    }
    res.json({ message: `Backlink '${backlink.url}' deleted successfully`, id: req.params.id });
  } catch (err) {
    console.error('Delete backlink error:', err);
    res.status(500).json({ error: 'Failed to delete backlink', details: err.message });
  }
});

// 6. GET /api/backlinks/export-final — Export all users' backlinks, deduplicate main domains, extract main domain URLs
router.get('/export-final', authenticateToken, async (req, res) => {
  try {
    const backlinks = await Backlink.find()
      .populate('projectId', 'businessName projectUrl')
      .populate('submittedBy', 'username email')
      .sort({ createdAt: -1 });

    // Extract unique main domain URLs
    const seenDomains = new Set();
    const finalExportList = [];

    backlinks.forEach(b => {
      let rootDomain = b.rootDomain || '';
      if (!rootDomain && b.url) {
        try {
          const parsed = new URL(b.url.includes('://') ? b.url : `https://${b.url}`);
          rootDomain = parsed.hostname.replace(/^www\./, '').toLowerCase();
        } catch (e) {
          rootDomain = b.url.toLowerCase();
        }
      }

      rootDomain = rootDomain.toLowerCase().trim();
      const mainDomainUrl = rootDomain ? `https://${rootDomain}` : b.url;

      if (rootDomain && !seenDomains.has(rootDomain)) {
        seenDomains.add(rootDomain);
        finalExportList.push({
          id: b._id,
          mainDomainUrl,
          rootDomain,
          originalUrl: b.url,
          linkType: b.linkType || 'Profile',
          da: b.daSnapshot || 0,
          pa: b.paSnapshot || 0,
          traffic: b.traffic || 'N/A',
          followType: b.followType || 'Do-Follow',
          status: b.status || 'Approved',
          anchorText: b.anchorText || '',
          projectName: b.projectId?.businessName || 'N/A',
          submittedBy: b.responsiblePersonName || b.submittedBy?.username || 'N/A',
          submissionDate: b.submissionDate || b.createdAt
        });
      }
    });

    res.json({
      totalUniqueDomains: finalExportList.length,
      totalRawSubmissions: backlinks.length,
      exportData: finalExportList
    });
  } catch (err) {
    console.error('Export final backlinks error:', err);
    res.status(500).json({ error: 'Failed to generate final backlink export', details: err.message });
  }
});

module.exports = router;

