const express = require('express');
const { body, validationResult, param } = require('express-validator');
const ChatRoom = require('../models/ChatRoom');
const User = require('../models/User');
const { auth, validateOwnership } = require('../middleware/auth');

const router = express.Router();

// @route   GET /api/chatrooms
// @desc    Get all public chat rooms
// @access  Public
router.get('/', async (req, res) => {
  try {
    const { page = 1, limit = 10, search = '' } = req.query;
    const skip = (page - 1) * limit;

    const query = {
      type: 'public',
      isActive: true
    };

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }

    const chatRooms = await ChatRoom.find(query)
      .populate('creator', 'name email avatar')
      .populate('members.user', 'name email avatar status')
      .populate('activeUsers.user', 'name email avatar status')
      .sort({ lastActivity: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await ChatRoom.countDocuments(query);

    res.json({
      chatRooms,
      pagination: {
        current: parseInt(page),
        pages: Math.ceil(total / limit),
        total
      }
    });
  } catch (error) {
    console.error('Get chat rooms error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/chatrooms/my-rooms
// @desc    Get user's chat rooms
// @access  Private
router.get('/my-rooms', auth, async (req, res) => {
  try {
    const chatRooms = await ChatRoom.find({
      'members.user': req.user.id,
      isActive: true
    })
      .populate('creator', 'name email avatar')
      .populate('members.user', 'name email avatar status')
      .populate('activeUsers.user', 'name email avatar status')
      .sort({ lastActivity: -1 });

    res.json(chatRooms);
  } catch (error) {
    console.error('Get my chat rooms error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   POST /api/chatrooms
// @desc    Create a new chat room
// @access  Private
router.post('/', auth, [
  body('name', 'Chat room name is required').notEmpty().trim(),
  body('name', 'Chat room name must be between 3 and 50 characters').isLength({ min: 3, max: 50 }),
  body('description', 'Description cannot exceed 200 characters').optional().isLength({ max: 200 }),
  body('type', 'Type must be public or private').optional().isIn(['public', 'private']),
  body('maxMembers', 'Max members must be between 2 and 1000').optional().isInt({ min: 2, max: 1000 })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { name, description, type = 'public', maxMembers = 100, settings } = req.body;

    // Check if chat room with same name already exists
    const existingRoom = await ChatRoom.findOne({ 
      name: { $regex: new RegExp(`^${name}$`, 'i') },
      isActive: true 
    });

    if (existingRoom) {
      return res.status(400).json({ message: 'A chat room with this name already exists' });
    }

    const chatRoom = new ChatRoom({
      name,
      description,
      type,
      creator: req.user.id,
      maxMembers,
      settings: {
        allowInvites: settings?.allowInvites ?? true,
        requireApproval: settings?.requireApproval ?? false,
        allowFileSharing: settings?.allowFileSharing ?? true
      }
    });

    await chatRoom.save();

    // Populate the created chat room
    await chatRoom.populate('creator', 'name email avatar');
    await chatRoom.populate('members.user', 'name email avatar status');

    res.status(201).json({
      message: 'Chat room created successfully',
      chatRoom
    });
  } catch (error) {
    console.error('Create chat room error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/chatrooms/:id
// @desc    Get a specific chat room
// @access  Private
router.get('/:id', auth, [
  param('id', 'Invalid chat room ID').isMongoId()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const chatRoom = await ChatRoom.findById(req.params.id)
      .populate('creator', 'name email avatar')
      .populate('members.user', 'name email avatar status')
      .populate('activeUsers.user', 'name email avatar status');

    if (!chatRoom || !chatRoom.isActive) {
      return res.status(404).json({ message: 'Chat room not found' });
    }

    // Check if user has access to this chat room
    if (chatRoom.type === 'private' && !chatRoom.isMember(req.user.id)) {
      return res.status(403).json({ message: 'Access denied to this private chat room' });
    }

    res.json(chatRoom);
  } catch (error) {
    console.error('Get chat room error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   POST /api/chatrooms/:id/join
// @desc    Join a chat room
// @access  Private
router.post('/:id/join', auth, [
  param('id', 'Invalid chat room ID').isMongoId()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const chatRoom = await ChatRoom.findById(req.params.id);

    if (!chatRoom || !chatRoom.isActive) {
      return res.status(404).json({ message: 'Chat room not found' });
    }

    // Check if already a member
    if (chatRoom.isMember(req.user.id)) {
      return res.status(400).json({ message: 'You are already a member of this chat room' });
    }

    // Check if room is full
    if (chatRoom.members.length >= chatRoom.maxMembers) {
      return res.status(400).json({ message: 'Chat room is full' });
    }

    // Add user as member
    chatRoom.addMember(req.user.id);
    chatRoom.lastActivity = new Date();
    await chatRoom.save();

    // Populate and return updated chat room
    await chatRoom.populate('creator', 'name email avatar');
    await chatRoom.populate('members.user', 'name email avatar status');
    await chatRoom.populate('activeUsers.user', 'name email avatar status');

    res.json({
      message: 'Successfully joined the chat room',
      chatRoom
    });
  } catch (error) {
    console.error('Join chat room error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   POST /api/chatrooms/:id/leave
// @desc    Leave a chat room
// @access  Private
router.post('/:id/leave', auth, [
  param('id', 'Invalid chat room ID').isMongoId()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const chatRoom = await ChatRoom.findById(req.params.id);

    if (!chatRoom || !chatRoom.isActive) {
      return res.status(404).json({ message: 'Chat room not found' });
    }

    // Check if user is a member
    if (!chatRoom.isMember(req.user.id)) {
      return res.status(400).json({ message: 'You are not a member of this chat room' });
    }

    // Check if user is the creator
    if (chatRoom.creator.toString() === req.user.id) {
      return res.status(400).json({ 
        message: 'Room creator cannot leave. Transfer ownership or delete the room instead.' 
      });
    }

    // Remove user from members and active users
    chatRoom.removeMember(req.user.id);
    await chatRoom.save();

    res.json({
      message: 'Successfully left the chat room'
    });
  } catch (error) {
    console.error('Leave chat room error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
