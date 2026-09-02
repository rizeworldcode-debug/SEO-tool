const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const Project = require('../models/Project');
const { authenticateToken, requireRole, sanitizeProjectResponse } = require('../utils/auth');
const { encryptCredentials } = require('../utils/encryption');

function normalizeUrl(urlStr) {
  if (!urlStr) return '';
  try {
    let formatted = urlStr.trim().toLowerCase();
    if (!formatted.startsWith('http://') && !formatted.startsWith('https://')) {
      formatted = 'https://' + formatted;
    }
    const parsed = new URL(formatted);
    return (parsed.hostname.replace(/^www\./, '') + parsed.pathname.replace(/\/$/, '')).toLowerCase();
  } catch (e) {
    return urlStr.trim().toLowerCase().replace(/^https?:\/\//, '').replace(/^www\./, '').replace(/\/$/, '');
  }
}

// 1. POST /api/projects — Admin & Team Leader only
router.post('/', authenticateToken, requireRole('admin', 'team_leader'), async (req, res) => {
  try {
    const {
      businessName,
      projectUrl,
      targetLocation,
      goal,
      category,
      username,
      domainAuthority,
      pageAuthority,
      spamScore,
      targetKeywords,
      firstName,
      lastName,
      designation,
      address,
      city,
      state,
      postcode,
      country,
      website,
      phone,
      businessEmail,
      numberOfEmployees,
      businessHours,
      yearOfEstablishment,
      socialLinks,
      offPageLogin
    } = req.body;

    if (!businessName || !projectUrl) {
      return res.status(400).json({ error: 'Missing required fields: businessName, projectUrl' });
    }

    // Duplicate project URL check
    const incomingNorm = normalizeUrl(projectUrl);
    let existingProjects = [];
    if (mongoose.connection.readyState === 1) {
      existingProjects = await Project.find();
    } else {
      existingProjects = mockProjects;
    }

    const duplicateProject = existingProjects.find(p => normalizeUrl(p.projectUrl) === incomingNorm);
    if (duplicateProject) {
      return res.status(400).json({
        error: `A project profile with URL "${projectUrl}" already exists ("${duplicateProject.businessName}")! Duplicate project profiles are not allowed.`
      });
    }

    let encryptedOffPage = null;
    if (offPageLogin && (offPageLogin.email || offPageLogin.password)) {
      encryptedOffPage = encryptCredentials(offPageLogin);
    }

    let parsedKeywords = [];
    if (Array.isArray(targetKeywords)) {
      parsedKeywords = targetKeywords.map(k => String(k).trim()).filter(Boolean);
    } else if (typeof targetKeywords === 'string') {
      parsedKeywords = targetKeywords.split(',').map(k => k.trim()).filter(Boolean);
    }

    const projectData = {
      _id: new mongoose.Types.ObjectId().toString(),
      businessName,
      projectUrl,
      targetLocation: targetLocation || '',
      goal: goal || '',
      category: category || '',
      username: username || '',
      domainAuthority: Number(domainAuthority) || 0,
      pageAuthority: Number(pageAuthority) || 0,
      spamScore: Number(spamScore) || 0,
      targetKeywords: parsedKeywords,

      firstName: firstName || '',
      lastName: lastName || '',
      designation: designation || '',
      address: address || '',
      city: city || '',
      state: state || '',
      postcode: postcode || '',
      country: country || '',
      website: website || projectUrl || '',
      phone: phone || '',
      businessEmail: businessEmail || '',
      numberOfEmployees: numberOfEmployees || '',
      businessHours: businessHours || '',
      yearOfEstablishment: yearOfEstablishment || '',

      socialLinks: socialLinks || {
        facebook: '',
        instagram: '',
        youtube: '',
        linkedin: '',
        twitter: '',
        other: ''
      },

      offPageLogin: encryptedOffPage,
      createdBy: req.user.id,
      createdAt: new Date()
    };

    if (mongoose.connection.readyState === 1) {
      const project = new Project(projectData);
      await project.save();
      mockProjects.unshift(project.toObject());
    } else {
      mockProjects.unshift(projectData);
    }

    const responsePayload = sanitizeProjectResponse(projectData, req.user.role);
    res.status(201).json({ message: 'Project created successfully', project: responsePayload });
  } catch (err) {
    console.error('Create project error:', err);
    res.status(500).json({ error: 'Failed to create project', details: err.message });
  }
});

// 2. GET /api/projects — Available to authenticated users (sanitized by role)
router.get('/', authenticateToken, async (req, res) => {
  try {
    let projects = [];
    if (mongoose.connection.readyState === 1) {
      try {
        projects = await Project.find().sort({ createdAt: -1 }).maxTimeMS(2000);
      } catch (e) {
        projects = mockProjects;
      }
    } else {
      projects = mockProjects;
    }

    const sanitized = projects.map(p => sanitizeProjectResponse(p, req.user.role));
    res.json({ projects: sanitized });
  } catch (err) {
    console.error('List projects error:', err);
    res.status(500).json({ error: 'Failed to fetch projects', details: err.message });
  }
});

// 3. GET /api/projects/:id/autofill — Returns complete auto-fill profile info for backlink submissions
router.get('/:id/autofill', authenticateToken, async (req, res) => {
  try {
    let project = null;
    if (mongoose.connection.readyState === 1) {
      project = await Project.findById(req.params.id);
    } else {
      project = mockProjects.find(p => (p._id || p.id) === req.params.id);
    }

    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    res.json({
      projectId: project._id || project.id,
      businessName: project.businessName,
      projectUrl: project.projectUrl,
      targetLocation: project.targetLocation,
      goal: project.goal,
      category: project.category,
      username: project.username,
      domainAuthority: project.domainAuthority,
      pageAuthority: project.pageAuthority,
      spamScore: project.spamScore,

      firstName: project.firstName,
      lastName: project.lastName,
      designation: project.designation,
      address: project.address,
      city: project.city,
      state: project.state,
      postcode: project.postcode,
      country: project.country,
      website: project.website || project.projectUrl,
      phone: project.phone,
      businessEmail: project.businessEmail,
      numberOfEmployees: project.numberOfEmployees,
      businessHours: project.businessHours,
      yearOfEstablishment: project.yearOfEstablishment,

      socialLinks: project.socialLinks || {},
      targetKeywords: project.targetKeywords || []
    });
  } catch (err) {
    console.error('Autofill fetch error:', err);
    res.status(500).json({ error: 'Failed to fetch project auto-fill profile', details: err.message });
  }
});

// 4. GET /api/projects/:id — Single project details (sanitized by role)
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    let project = null;
    if (mongoose.connection.readyState === 1) {
      project = await Project.findById(req.params.id);
    } else {
      project = mockProjects.find(p => (p._id || p.id) === req.params.id);
    }

    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    const sanitized = sanitizeProjectResponse(project, req.user.role);
    res.json({ project: sanitized });
  } catch (err) {
    console.error('Get project error:', err);
    res.status(500).json({ error: 'Failed to fetch project', details: err.message });
  }
});

// 5. PUT /api/projects/:id — Admin & Team Leader only
router.put('/:id', authenticateToken, requireRole('admin', 'team_leader'), async (req, res) => {
  try {
    let project = null;
    if (mongoose.connection.readyState === 1) {
      project = await Project.findById(req.params.id);
    } else {
      project = mockProjects.find(p => (p._id || p.id) === req.params.id);
    }

    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    if (req.body.projectUrl && req.body.projectUrl !== project.projectUrl) {
      const incomingNorm = normalizeUrl(req.body.projectUrl);
      let existingProjects = [];
      if (mongoose.connection.readyState === 1) {
        existingProjects = await Project.find({ _id: { $ne: req.params.id } });
      } else {
        existingProjects = mockProjects.filter(p => (p._id || p.id) !== req.params.id);
      }
      const duplicateProject = existingProjects.find(p => normalizeUrl(p.projectUrl) === incomingNorm);
      if (duplicateProject) {
        return res.status(400).json({
          error: `Another project profile with URL "${req.body.projectUrl}" already exists ("${duplicateProject.businessName}")!`
        });
      }
    }

    const fields = [
      'businessName', 'projectUrl', 'targetLocation', 'goal', 'category', 'username',
      'domainAuthority', 'pageAuthority', 'spamScore', 'targetKeywords',
      'firstName', 'lastName', 'designation', 'address', 'city', 'state',
      'postcode', 'country', 'website', 'phone', 'businessEmail',
      'numberOfEmployees', 'businessHours', 'yearOfEstablishment', 'socialLinks'
    ];

    fields.forEach(field => {
      if (req.body[field] !== undefined) {
        if (field === 'targetKeywords') {
          if (Array.isArray(req.body.targetKeywords)) {
            project.targetKeywords = req.body.targetKeywords.map(k => String(k).trim()).filter(Boolean);
          } else if (typeof req.body.targetKeywords === 'string') {
            project.targetKeywords = req.body.targetKeywords.split(',').map(k => k.trim()).filter(Boolean);
          }
        } else {
          project[field] = req.body[field];
        }
      }
    });

    if (req.body.offPageLogin && (req.body.offPageLogin.email || req.body.offPageLogin.password)) {
      project.offPageLogin = encryptCredentials(req.body.offPageLogin);
    }

    if (mongoose.connection.readyState === 1) {
      await project.save();
    }

    const sanitized = sanitizeProjectResponse(project, req.user.role);
    res.json({ message: 'Project updated successfully', project: sanitized });
  } catch (err) {
    console.error('Update project error:', err);
    res.status(500).json({ error: 'Failed to update project', details: err.message });
  }
});

// 6. DELETE /api/projects/:id — Admin only
router.delete('/:id', authenticateToken, requireRole('admin'), async (req, res) => {
  try {
    if (mongoose.connection.readyState === 1) {
      const project = await Project.findByIdAndDelete(req.params.id);
      if (!project) {
        return res.status(404).json({ error: 'Project not found' });
      }
    } else {
      const idx = mockProjects.findIndex(p => (p._id || p.id) === req.params.id);
      if (idx === -1) return res.status(404).json({ error: 'Project not found' });
      mockProjects.splice(idx, 1);
    }
    res.json({ message: 'Project deleted successfully' });
  } catch (err) {
    console.error('Delete project error:', err);
    res.status(500).json({ error: 'Failed to delete project', details: err.message });
  }
});

module.exports = router;
