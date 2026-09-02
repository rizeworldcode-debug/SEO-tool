const express = require('express');
const router = express.Router();
const Backlink = require('../models/Backlink');
const Project = require('../models/Project');
const { analyzeAnchorDistribution } = require('../services/anchorAnalyzer');
const { analyzeLinkVelocity } = require('../services/velocityTracker');
const { authenticateToken } = require('../utils/auth');

// 1. GET /api/reports/anchor-distribution — Anchor text categorization & over-optimization report
router.get('/anchor-distribution', authenticateToken, async (req, res) => {
  try {
    const { projectId } = req.query;

    if (!projectId) {
      return res.status(400).json({ error: 'Missing required query parameter: projectId' });
    }

    const project = await Project.findById(projectId);
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    const backlinks = await Backlink.find({ projectId, status: { $ne: 'removed' } });

    const report = analyzeAnchorDistribution(backlinks, {
      businessName: project.businessName,
      projectUrl: project.projectUrl,
      targetKeywords: project.targetKeywords || []
    });

    res.json({
      project: {
        id: project._id,
        businessName: project.businessName,
        projectUrl: project.projectUrl,
        targetKeywords: project.targetKeywords || []
      },
      report
    });
  } catch (err) {
    console.error('Anchor distribution report error:', err);
    res.status(500).json({ error: 'Failed to generate anchor distribution report', details: err.message });
  }
});

// 2. GET /api/reports/link-velocity — Weekly link velocity & spike detection report
router.get('/link-velocity', authenticateToken, async (req, res) => {
  try {
    const { projectId } = req.query;

    if (!projectId) {
      return res.status(400).json({ error: 'Missing required query parameter: projectId' });
    }

    const project = await Project.findById(projectId);
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    const backlinks = await Backlink.find({ projectId, status: { $ne: 'removed' } });

    const velocityReport = analyzeLinkVelocity(backlinks);

    res.json({
      project: {
        id: project._id,
        businessName: project.businessName,
        projectUrl: project.projectUrl
      },
      velocityReport
    });
  } catch (err) {
    console.error('Link velocity report error:', err);
    res.status(500).json({ error: 'Failed to generate link velocity report', details: err.message });
  }
});

module.exports = router;
