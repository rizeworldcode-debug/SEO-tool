const express = require('express');
const router = express.Router();
const User = require('../models/User');
const { authenticateToken, requireRole } = require('../utils/auth');

// GET /api/users — List all users (Admin only)
router.get('/', authenticateToken, requireRole('admin'), async (req, res) => {
  try {
    const users = await User.find().select('-password').sort({ createdAt: -1 });
    res.json({ users });
  } catch (err) {
    console.error('List users error:', err);
    res.status(500).json({ error: 'Failed to fetch users', details: err.message });
  }
});

// POST /api/users — Create new user (Admin only)
router.post('/', authenticateToken, requireRole('admin'), async (req, res) => {
  try {
    const { username, email, password, role } = req.body;
    const allowedRoles = ['admin', 'team_leader', 'team_member'];

    if (!username || !email || !password) {
      return res.status(400).json({ error: 'Missing required fields: username, email, password' });
    }

    const targetRole = allowedRoles.includes(role) ? role : 'team_member';

    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing) {
      return res.status(400).json({ error: 'User with this email already exists' });
    }

    const newUser = new User({
      username,
      email: email.toLowerCase(),
      password,
      role: targetRole
    });

    await newUser.save();

    res.status(201).json({
      message: `User '${username}' created successfully as ${targetRole}`,
      user: {
        id: newUser._id,
        username: newUser.username,
        email: newUser.email,
        role: newUser.role,
        createdAt: newUser.createdAt
      }
    });
  } catch (err) {
    console.error('Create user error:', err);
    res.status(500).json({ error: 'Failed to create user', details: err.message });
  }
});

// PATCH /api/users/:id/role — Restricted to Admin role only
router.patch('/:id/role', authenticateToken, requireRole('admin'), async (req, res) => {
  try {
    const { role } = req.body;
    const allowedRoles = ['admin', 'team_leader', 'team_member'];

    if (!role || !allowedRoles.includes(role)) {
      return res.status(400).json({ error: `Invalid role specified. Allowed values: [${allowedRoles.join(', ')}]` });
    }

    const targetUser = await User.findById(req.params.id);
    if (!targetUser) {
      return res.status(404).json({ error: 'Target user not found' });
    }

    targetUser.role = role;
    await targetUser.save();

    res.json({
      message: `User '${targetUser.username}' role successfully updated to '${role}'`,
      user: {
        id: targetUser._id,
        username: targetUser.username,
        email: targetUser.email,
        role: targetUser.role
      }
    });
  } catch (err) {
    console.error('Role update error:', err);
    res.status(500).json({ error: 'Failed to update user role', details: err.message });
  }
});

module.exports = router;
