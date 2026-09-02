const express = require('express');
const router = express.Router();
const User = require('../models/User');
const { generateToken, authenticateToken } = require('../utils/auth');

// 1. POST /api/auth/register
// CRITICAL SECURITY FIX: Registration ALWAYS forces role to 'team_member', ignoring any role sent in req.body
router.post('/register', async (req, res) => {
  try {
    const { username, email, password } = req.body;

    if (!username || !email || !password) {
      return res.status(400).json({ error: 'Missing required fields: username, email, password' });
    }

    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(400).json({ error: 'User with this email already exists' });
    }

    // Force role to 'team_member' regardless of client input
    const user = new User({
      username,
      email,
      password,
      role: 'team_member'
    });

    await user.save();

    const token = generateToken(user);
    res.status(201).json({
      message: 'User registered successfully',
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        role: user.role
      }
    });
  } catch (err) {
    console.error('Registration error:', err);
    res.status(500).json({ error: 'Failed to register user', details: err.message });
  }
});

// 2. POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Missing required fields: email, password' });
    }

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const token = generateToken(user);
    res.json({
      message: 'Login successful',
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        role: user.role
      }
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Failed to log in', details: err.message });
  }
});

// 3. GET /api/auth/me
router.get('/me', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json({ user });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch user profile', details: err.message });
  }
});

const mongoose = require('mongoose');

// 4. POST /api/auth/demo-token — Issue a valid JWT token for a specific role (Admin / Team Leader / Team Member)
router.post('/demo-token', async (req, res) => {
  try {
    const { role } = req.body;
    const targetRole = ['admin', 'team_leader', 'team_member'].includes(role) ? role : 'admin';

    let user = null;
    if (mongoose.connection.readyState === 1) {
      try {
        user = await User.findOne({ role: targetRole }).maxTimeMS(2000);
      } catch (e) {
        user = null;
      }
    }

    if (!user) {
      user = {
        _id: targetRole === 'admin' ? '507f1f77bcf86cd799439011' : targetRole === 'team_leader' ? '507f1f77bcf86cd799439012' : '507f1f77bcf86cd799439013',
        id: targetRole === 'admin' ? '507f1f77bcf86cd799439011' : targetRole === 'team_leader' ? '507f1f77bcf86cd799439012' : '507f1f77bcf86cd799439013',
        username: `Demo_${targetRole}`,
        email: `demo_${targetRole}@rizeworld.com`,
        role: targetRole
      };
    }

    const token = generateToken(user);
    res.json({
      message: `Issued demo token for role: ${targetRole}`,
      token,
      user: {
        id: user._id || user.id,
        username: user.username,
        email: user.email,
        role: user.role
      }
    });
  } catch (err) {
    console.error('Demo token error:', err);
    res.status(500).json({ error: 'Failed to issue demo token', details: err.message });
  }
});

module.exports = router;
