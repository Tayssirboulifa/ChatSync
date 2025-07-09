const express = require('express');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const User = require('../models/User');
const { auth, authRateLimit } = require('../middleware/auth');
const { generateTokenPair, verifyRefreshToken, revokeRefreshToken, revokeAllUserTokens } = require('../utils/jwt');

const router = express.Router();

// @route   POST /api/auth/register
// @desc    Register a new user
// @access  Public
router.post('/register', authRateLimit, [
  body('name', 'Name is required').notEmpty(),
  body('email', 'Please include a valid email').isEmail(),
  body('password', 'Password must be at least 6 characters').isLength({ min: 6 })
], async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { name, email, password } = req.body;

    // Check if user already exists
    let user = await User.findOne({ email });
    if (user) {
      return res.status(400).json({ message: 'User already exists' });
    }

    // Create new user
    user = new User({
      name,
      email,
      password
    });

    await user.save();

    // Generate token pair
    const tokens = generateTokenPair(user);

    res.status(201).json({
      ...tokens,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        avatar: user.avatar,
        status: user.status,
        isOnline: user.isOnline
      }
    });
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   POST /api/auth/login
// @desc    Login user
// @access  Public
router.post('/login', authRateLimit, [
  body('email', 'Please include a valid email').isEmail(),
  body('password', 'Password is required').exists()
], async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, password } = req.body;

    // Check if user exists
    let user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    // Check password
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    // Update user status to online
    user.status = 'online';
    user.isOnline = true;
    user.lastSeen = new Date();
    await user.save();

    // Generate token pair
    const tokens = generateTokenPair(user);

    res.json({
      ...tokens,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        avatar: user.avatar,
        status: user.status,
        isOnline: user.isOnline
      }
    });
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   POST /api/auth/refresh
// @desc    Refresh access token
// @access  Public
router.post('/refresh', [
  body('refreshToken', 'Refresh token is required').notEmpty()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { refreshToken } = req.body;

    // Verify refresh token
    const userId = verifyRefreshToken(refreshToken);

    // Get user from database
    const user = await User.findById(userId);
    if (!user || !user.isActive) {
      return res.status(401).json({ message: 'Invalid refresh token' });
    }

    // Generate new token pair
    const tokens = generateTokenPair(user);

    // Revoke old refresh token
    revokeRefreshToken(refreshToken);

    res.json({
      ...tokens,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        avatar: user.avatar,
        status: user.status,
        isOnline: user.isOnline
      }
    });
  } catch (error) {
    console.error(error.message);
    res.status(401).json({ message: 'Invalid refresh token' });
  }
});

// @route   POST /api/auth/logout
// @desc    Logout user and update status
// @access  Private
router.post('/logout', auth, [
  body('refreshToken', 'Refresh token is required').optional()
], async (req, res) => {
  try {
    // Update user status to offline
    const user = await User.findById(req.user.id);
    if (user) {
      user.status = 'offline';
      user.isOnline = false;
      user.lastSeen = new Date();
      await user.save();
    }

    // Revoke refresh token if provided
    const { refreshToken } = req.body;
    if (refreshToken) {
      revokeRefreshToken(refreshToken);
    }

    res.json({ message: 'Logged out successfully' });
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   POST /api/auth/logout-all
// @desc    Logout from all devices
// @access  Private
router.post('/logout-all', auth, async (req, res) => {
  try {
    // Update user status to offline
    const user = await User.findById(req.user.id);
    if (user) {
      user.status = 'offline';
      user.isOnline = false;
      user.lastSeen = new Date();
      await user.save();
    }

    // Revoke all refresh tokens for this user
    revokeAllUserTokens(req.user.id);

    res.json({ message: 'Logged out from all devices successfully' });
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/auth/me
// @desc    Get current user
// @access  Private
router.get('/me', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    res.json(user);
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   PUT /api/auth/status
// @desc    Update user status
// @access  Private
router.put('/status', auth, [
  body('status', 'Status must be online, offline, or away').isIn(['online', 'offline', 'away'])
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { status } = req.body;
    const user = await User.findById(req.user.id);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    user.status = status;
    user.isOnline = status === 'online';
    user.lastSeen = new Date();
    await user.save();

    res.json({
      message: 'Status updated successfully',
      user: {
        id: user.id,
        name: user.name,
        status: user.status,
        isOnline: user.isOnline,
        lastSeen: user.lastSeen
      }
    });
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   PUT /api/auth/profile
// @desc    Update user profile
// @access  Private
router.put('/profile', auth, [
  body('name', 'Name is required').optional().notEmpty(),
  body('avatar', 'Avatar must be a valid URL').optional().isURL()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { name, avatar } = req.body;
    const user = await User.findById(req.user.id);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (name) user.name = name;
    if (avatar !== undefined) user.avatar = avatar;

    await user.save();

    res.json({
      message: 'Profile updated successfully',
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        avatar: user.avatar,
        status: user.status,
        isOnline: user.isOnline
      }
    });
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
