const express = require('express');
const { body, validationResult, param, query } = require('express-validator');
const Message = require('../models/Message');
const ChatRoom = require('../models/ChatRoom');
const { auth } = require('../middleware/auth');

const router = express.Router();

// @route   GET /api/messages/:roomId
// @desc    Get messages for a chat room
// @access  Private
router.get('/:roomId', auth, [
  param('roomId', 'Invalid room ID').isMongoId(),
  query('page', 'Page must be a positive integer').optional().isInt({ min: 1 }),
  query('limit', 'Limit must be between 1 and 100').optional().isInt({ min: 1, max: 100 })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { roomId } = req.params;
    const { page = 1, limit = 50 } = req.query;

    // Check if user is a member of the chat room
    const chatRoom = await ChatRoom.findById(roomId);
    if (!chatRoom || !chatRoom.isActive) {
      return res.status(404).json({ message: 'Chat room not found' });
    }

    if (!chatRoom.isMember(req.user.id)) {
      return res.status(403).json({ message: 'Access denied to this chat room' });
    }

    // Get messages with pagination
    const messages = await Message.getMessagesForRoom(roomId, parseInt(page), parseInt(limit));
    
    // Reverse to show oldest first
    messages.reverse();

    // Get total count for pagination
    const total = await Message.countDocuments({
      chatRoom: roomId,
      isDeleted: false
    });

    // Mark messages as read by current user
    const unreadMessages = messages.filter(msg => 
      !msg.readBy.some(read => read.user.toString() === req.user.id)
    );

    if (unreadMessages.length > 0) {
      await Message.updateMany(
        {
          _id: { $in: unreadMessages.map(msg => msg._id) },
          'readBy.user': { $ne: req.user.id }
        },
        {
          $push: {
            readBy: {
              user: req.user.id,
              readAt: new Date()
            }
          }
        }
      );
    }

    res.json({
      messages,
      pagination: {
        current: parseInt(page),
        pages: Math.ceil(total / limit),
        total,
        hasMore: page * limit < total
      }
    });
  } catch (error) {
    console.error('Get messages error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   POST /api/messages/:roomId
// @desc    Send a message to a chat room
// @access  Private
router.post('/:roomId', auth, [
  param('roomId', 'Invalid room ID').isMongoId(),
  body('content', 'Message content is required').notEmpty().trim(),
  body('content', 'Message cannot exceed 2000 characters').isLength({ max: 2000 }),
  body('messageType', 'Invalid message type').optional().isIn(['text', 'image', 'file']),
  body('replyTo', 'Invalid reply message ID').optional().isMongoId()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { roomId } = req.params;
    const { content, messageType = 'text', replyTo, mentions } = req.body;

    // Check if user is a member of the chat room
    const chatRoom = await ChatRoom.findById(roomId);
    if (!chatRoom || !chatRoom.isActive) {
      return res.status(404).json({ message: 'Chat room not found' });
    }

    if (!chatRoom.isMember(req.user.id)) {
      return res.status(403).json({ message: 'Access denied to this chat room' });
    }

    // Validate reply message if provided
    if (replyTo) {
      const replyMessage = await Message.findOne({
        _id: replyTo,
        chatRoom: roomId,
        isDeleted: false
      });
      
      if (!replyMessage) {
        return res.status(400).json({ message: 'Reply message not found' });
      }
    }

    // Create new message
    const message = new Message({
      content,
      sender: req.user.id,
      chatRoom: roomId,
      messageType,
      replyTo: replyTo || null,
      mentions: mentions || [],
      metadata: {
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
        platform: req.get('X-Platform') || 'web'
      }
    });

    await message.save();

    // Populate the message for response
    await message.populate('sender', 'name email avatar status');
    if (replyTo) {
      await message.populate('replyTo', 'content sender createdAt');
    }

    res.status(201).json({
      message: 'Message sent successfully',
      data: message
    });
  } catch (error) {
    console.error('Send message error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   PUT /api/messages/:messageId
// @desc    Edit a message
// @access  Private
router.put('/:messageId', auth, [
  param('messageId', 'Invalid message ID').isMongoId(),
  body('content', 'Message content is required').notEmpty().trim(),
  body('content', 'Message cannot exceed 2000 characters').isLength({ max: 2000 })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { messageId } = req.params;
    const { content } = req.body;

    const message = await Message.findOne({
      _id: messageId,
      isDeleted: false
    }).populate('sender', 'name email avatar');

    if (!message) {
      return res.status(404).json({ message: 'Message not found' });
    }

    // Check if user is the sender
    if (message.sender._id.toString() !== req.user.id) {
      return res.status(403).json({ message: 'You can only edit your own messages' });
    }

    // Check if message is not too old (e.g., 15 minutes)
    const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000);
    if (message.createdAt < fifteenMinutesAgo) {
      return res.status(400).json({ message: 'Message is too old to edit' });
    }

    // Edit the message
    message.editMessage(content);
    await message.save();

    res.json({
      message: 'Message updated successfully',
      data: message
    });
  } catch (error) {
    console.error('Edit message error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   DELETE /api/messages/:messageId
// @desc    Delete a message
// @access  Private
router.delete('/:messageId', auth, [
  param('messageId', 'Invalid message ID').isMongoId()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { messageId } = req.params;

    const message = await Message.findOne({
      _id: messageId,
      isDeleted: false
    }).populate('sender', 'name email avatar');

    if (!message) {
      return res.status(404).json({ message: 'Message not found' });
    }

    // Check if user is the sender or room admin
    const chatRoom = await ChatRoom.findById(message.chatRoom);
    const isRoomAdmin = chatRoom.isAdminOrModerator(req.user.id);
    const isMessageSender = message.sender._id.toString() === req.user.id;

    if (!isMessageSender && !isRoomAdmin) {
      return res.status(403).json({ message: 'You can only delete your own messages' });
    }

    // Soft delete the message
    message.softDelete(req.user.id);
    await message.save();

    res.json({
      message: 'Message deleted successfully'
    });
  } catch (error) {
    console.error('Delete message error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   POST /api/messages/:messageId/react
// @desc    Add reaction to a message
// @access  Private
router.post('/:messageId/react', auth, [
  param('messageId', 'Invalid message ID').isMongoId(),
  body('emoji', 'Emoji is required').notEmpty().trim(),
  body('emoji', 'Emoji too long').isLength({ max: 10 })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { messageId } = req.params;
    const { emoji } = req.body;

    const message = await Message.findOne({
      _id: messageId,
      isDeleted: false
    });

    if (!message) {
      return res.status(404).json({ message: 'Message not found' });
    }

    // Check if user is a member of the chat room
    const chatRoom = await ChatRoom.findById(message.chatRoom);
    if (!chatRoom.isMember(req.user.id)) {
      return res.status(403).json({ message: 'Access denied to this chat room' });
    }

    // Add reaction
    message.addReaction(req.user.id, emoji);
    await message.save();

    res.json({
      message: 'Reaction added successfully',
      reactions: message.reactionSummary
    });
  } catch (error) {
    console.error('Add reaction error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
