const jwt = require('jsonwebtoken');
const User = require('../models/User');
const ChatRoom = require('../models/ChatRoom');
const Message = require('../models/Message');

// Store active connections and rate limiting
const activeConnections = new Map();
const rateLimits = new Map(); // userId -> { joinRoom: timestamp, leaveRoom: timestamp }

module.exports = (io) => {
  // Middleware for socket authentication
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token;
      
      if (!token) {
        return next(new Error('Authentication error'));
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.user.id).select('-password');
      
      if (!user) {
        return next(new Error('User not found'));
      }

      socket.userId = user._id.toString();
      socket.user = user;
      next();
    } catch (error) {
      next(new Error('Authentication error'));
    }
  });

  io.on('connection', (socket) => {
    console.log(`User ${socket.user.name} connected with socket ID: ${socket.id}`);
    
    // Store the connection
    activeConnections.set(socket.userId, {
      socketId: socket.id,
      user: socket.user,
      joinedRooms: new Set()
    });

    // Update user status to online
    updateUserStatus(socket.userId, 'online');

    // Handle joining a chat room
    socket.on('join-room', async (data) => {
      try {
        const { roomId } = data;

        if (!roomId) {
          return;
        }

        // Rate limiting - prevent spam requests
        const now = Date.now();
        const userLimits = rateLimits.get(socket.userId) || {};
        if (userLimits.joinRoom && (now - userLimits.joinRoom) < 2000) {
          return;
        }
        rateLimits.set(socket.userId, { ...userLimits, joinRoom: now });

        console.log(`User ${socket.user.name} joining room ${roomId}`);

        // Check if user is already in the room
        const connection = activeConnections.get(socket.userId);
        if (connection && connection.joinedRooms.has(roomId)) {
          return;
        }

        // Simple room validation without database update
        const chatRoom = await ChatRoom.findById(roomId);
        if (!chatRoom || !chatRoom.isActive || !chatRoom.isMember(socket.userId)) {
          socket.emit('error', { message: 'Cannot join room' });
          return;
        }

        // Join the socket room
        socket.join(roomId);

        // Update local tracking only
        if (connection) {
          connection.joinedRooms.add(roomId);
        }

        // Send simple confirmation
        socket.emit('joined-room', {
          roomId,
          activeUsers: []
        });

        console.log(`User ${socket.user.name} joined room ${roomId}`);
      } catch (error) {
        console.error('Join room error:', error);
      }
    });

    // Handle leaving a chat room
    socket.on('leave-room', async (data) => {
      try {
        const { roomId } = data;

        if (!roomId) {
          return;
        }

        // Rate limiting - prevent spam requests
        const now = Date.now();
        const userLimits = rateLimits.get(socket.userId) || {};
        if (userLimits.leaveRoom && (now - userLimits.leaveRoom) < 2000) {
          return;
        }
        rateLimits.set(socket.userId, { ...userLimits, leaveRoom: now });

        console.log(`User ${socket.user.name} leaving room ${roomId}`);

        // Check if user is actually in the room
        const connection = activeConnections.get(socket.userId);
        if (!connection || !connection.joinedRooms.has(roomId)) {
          return;
        }

        // Leave the socket room
        socket.leave(roomId);

        // Update local tracking only
        connection.joinedRooms.delete(roomId);

        // Send simple confirmation
        socket.emit('left-room', { roomId });

        console.log(`User ${socket.user.name} left room ${roomId}`);
      } catch (error) {
        console.error('Leave room error:', error);
      }
    });

    // Handle sending messages
    socket.on('send-message', async (data) => {
      try {
        const { roomId, content, messageType = 'text', replyTo } = data;

        const chatRoom = await ChatRoom.findById(roomId);
        if (!chatRoom || !chatRoom.isMember(socket.userId)) {
          socket.emit('error', { message: 'Cannot send message to this room' });
          return;
        }

        // Validate message content
        if (!content || content.trim().length === 0) {
          socket.emit('error', { message: 'Message content cannot be empty' });
          return;
        }

        if (content.length > 2000) {
          socket.emit('error', { message: 'Message too long' });
          return;
        }

        // Validate reply message if provided
        if (replyTo) {
          const replyMessage = await Message.findOne({
            _id: replyTo,
            chatRoom: roomId,
            isDeleted: false
          });

          if (!replyMessage) {
            socket.emit('error', { message: 'Reply message not found' });
            return;
          }
        }

        // Create and save message to database
        const message = new Message({
          content: content.trim(),
          sender: socket.userId,
          chatRoom: roomId,
          messageType,
          replyTo: replyTo || null,
          metadata: {
            platform: 'socket'
          }
        });

        await message.save();

        // Populate message for broadcasting
        await message.populate('sender', 'name email avatar status');
        if (replyTo) {
          await message.populate('replyTo', 'content sender createdAt');
        }

        // Update last activity
        chatRoom.lastActivity = new Date();
        await chatRoom.save();

        // Broadcast message to all users in the room
        const messageData = {
          _id: message._id,
          content: message.content,
          sender: {
            _id: message.sender._id,
            name: message.sender.name,
            email: message.sender.email,
            avatar: message.sender.avatar,
            status: message.sender.status
          },
          chatRoom: roomId,
          messageType: message.messageType,
          replyTo: message.replyTo,
          createdAt: message.createdAt,
          updatedAt: message.updatedAt,
          edited: message.edited,
          reactions: message.reactions
        };

        io.to(roomId).emit('new-message', messageData);

        // Send confirmation to sender
        socket.emit('message-sent', {
          tempId: data.tempId, // For client-side message tracking
          message: messageData
        });

        console.log(`Message sent in room ${roomId} by ${socket.user.name}`);
      } catch (error) {
        console.error('Send message error:', error);
        socket.emit('error', {
          message: 'Failed to send message',
          tempId: data.tempId
        });
      }
    });

    // Handle user status updates
    socket.on('update-status', async (data) => {
      try {
        const { status } = data;
        await updateUserStatus(socket.userId, status);
        
        // Notify all rooms the user is in
        const connection = activeConnections.get(socket.userId);
        if (connection) {
          connection.joinedRooms.forEach(roomId => {
            socket.to(roomId).emit('user-status-updated', {
              userId: socket.userId,
              status
            });
          });
        }
      } catch (error) {
        console.error('Update status error:', error);
      }
    });

    // Handle message editing
    socket.on('edit-message', async (data) => {
      try {
        const { messageId, content } = data;

        const message = await Message.findOne({
          _id: messageId,
          sender: socket.userId,
          isDeleted: false
        }).populate('sender', 'name email avatar status');

        if (!message) {
          socket.emit('error', { message: 'Message not found or access denied' });
          return;
        }

        // Check if message is not too old (15 minutes)
        const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000);
        if (message.createdAt < fifteenMinutesAgo) {
          socket.emit('error', { message: 'Message is too old to edit' });
          return;
        }

        // Edit the message
        message.editMessage(content.trim());
        await message.save();

        // Broadcast the edit to all users in the room
        io.to(message.chatRoom.toString()).emit('message-edited', {
          messageId: message._id,
          content: message.content,
          edited: message.edited
        });

        console.log(`Message ${messageId} edited by ${socket.user.name}`);
      } catch (error) {
        console.error('Edit message error:', error);
        socket.emit('error', { message: 'Failed to edit message' });
      }
    });

    // Handle message deletion
    socket.on('delete-message', async (data) => {
      try {
        const { messageId } = data;

        const message = await Message.findOne({
          _id: messageId,
          isDeleted: false
        }).populate('sender', 'name email avatar');

        if (!message) {
          socket.emit('error', { message: 'Message not found' });
          return;
        }

        // Check if user is the sender or room admin
        const chatRoom = await ChatRoom.findById(message.chatRoom);
        const isRoomAdmin = chatRoom.isAdminOrModerator(socket.userId);
        const isMessageSender = message.sender._id.toString() === socket.userId;

        if (!isMessageSender && !isRoomAdmin) {
          socket.emit('error', { message: 'You can only delete your own messages' });
          return;
        }

        // Soft delete the message
        message.softDelete(socket.userId);
        await message.save();

        // Broadcast the deletion to all users in the room
        io.to(message.chatRoom.toString()).emit('message-deleted', {
          messageId: message._id,
          deletedBy: socket.userId
        });

        console.log(`Message ${messageId} deleted by ${socket.user.name}`);
      } catch (error) {
        console.error('Delete message error:', error);
        socket.emit('error', { message: 'Failed to delete message' });
      }
    });

    // Handle message reactions
    socket.on('add-reaction', async (data) => {
      try {
        const { messageId, emoji } = data;

        const message = await Message.findOne({
          _id: messageId,
          isDeleted: false
        });

        if (!message) {
          socket.emit('error', { message: 'Message not found' });
          return;
        }

        // Check if user is a member of the chat room
        const chatRoom = await ChatRoom.findById(message.chatRoom);
        if (!chatRoom.isMember(socket.userId)) {
          socket.emit('error', { message: 'Access denied to this chat room' });
          return;
        }

        // Add reaction
        message.addReaction(socket.userId, emoji);
        await message.save();

        // Broadcast the reaction to all users in the room
        io.to(message.chatRoom.toString()).emit('reaction-added', {
          messageId: message._id,
          userId: socket.userId,
          userName: socket.user.name,
          emoji,
          reactions: message.reactionSummary
        });

        console.log(`Reaction ${emoji} added to message ${messageId} by ${socket.user.name}`);
      } catch (error) {
        console.error('Add reaction error:', error);
        socket.emit('error', { message: 'Failed to add reaction' });
      }
    });

    // Handle typing indicators
    socket.on('typing-start', (data) => {
      const { roomId } = data;
      socket.to(roomId).emit('user-typing', {
        userId: socket.userId,
        userName: socket.user.name,
        roomId
      });
    });

    socket.on('typing-stop', (data) => {
      const { roomId } = data;
      socket.to(roomId).emit('user-stopped-typing', {
        userId: socket.userId,
        roomId
      });
    });

    // Handle message read receipts
    socket.on('mark-messages-read', async (data) => {
      try {
        const { roomId, messageIds } = data;

        // Verify user is in the room
        const chatRoom = await ChatRoom.findById(roomId);
        if (!chatRoom || !chatRoom.isMember(socket.userId)) {
          return;
        }

        // Mark messages as read
        await Message.updateMany(
          {
            _id: { $in: messageIds },
            chatRoom: roomId,
            'readBy.user': { $ne: socket.userId }
          },
          {
            $push: {
              readBy: {
                user: socket.userId,
                readAt: new Date()
              }
            }
          }
        );

        // Broadcast read receipts to other users in the room
        socket.to(roomId).emit('messages-read', {
          userId: socket.userId,
          userName: socket.user.name,
          messageIds
        });

      } catch (error) {
        console.error('Mark messages read error:', error);
      }
    });

    // Handle disconnection
    socket.on('disconnect', async () => {
      console.log(`User ${socket.user.name} disconnected`);
      
      try {
        // Remove from all chat rooms
        const connection = activeConnections.get(socket.userId);
        if (connection) {
          for (const roomId of connection.joinedRooms) {
            const chatRoom = await ChatRoom.findById(roomId);
            if (chatRoom) {
              chatRoom.removeActiveUserBySocket(socket.id);
              await chatRoom.save();
              
              // Notify other users in the room
              socket.to(roomId).emit('user-left-room', {
                roomId,
                userId: socket.userId,
                activeUsers: chatRoom.activeUsers
              });
            }
          }
        }

        // Remove from active connections
        activeConnections.delete(socket.userId);
        
        // Update user status to offline
        await updateUserStatus(socket.userId, 'offline');
      } catch (error) {
        console.error('Disconnect cleanup error:', error);
      }
    });
  });

  // Helper function to update user status
  async function updateUserStatus(userId, status) {
    try {
      await User.findByIdAndUpdate(userId, {
        status,
        isOnline: status === 'online',
        lastSeen: new Date()
      });
    } catch (error) {
      console.error('Update user status error:', error);
    }
  }
};
