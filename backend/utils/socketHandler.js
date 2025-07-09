const jwt = require('jsonwebtoken');
const User = require('../models/User');
const ChatRoom = require('../models/ChatRoom');

// Store active connections
const activeConnections = new Map();

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
        
        const chatRoom = await ChatRoom.findById(roomId);
        if (!chatRoom || !chatRoom.isActive) {
          socket.emit('error', { message: 'Chat room not found' });
          return;
        }

        // Check if user is a member
        if (!chatRoom.isMember(socket.userId)) {
          socket.emit('error', { message: 'You are not a member of this chat room' });
          return;
        }

        // Join the socket room
        socket.join(roomId);
        
        // Add to active users in database
        chatRoom.addActiveUser(socket.userId, socket.id);
        await chatRoom.save();

        // Update local tracking
        const connection = activeConnections.get(socket.userId);
        if (connection) {
          connection.joinedRooms.add(roomId);
        }

        // Populate and get updated room data
        await chatRoom.populate('activeUsers.user', 'name email avatar status');
        
        // Notify all users in the room about the new user
        socket.to(roomId).emit('user-joined-room', {
          roomId,
          user: {
            id: socket.user._id,
            name: socket.user.name,
            email: socket.user.email,
            avatar: socket.user.avatar,
            status: socket.user.status
          },
          activeUsers: chatRoom.activeUsers
        });

        // Send confirmation to the user
        socket.emit('joined-room', {
          roomId,
          activeUsers: chatRoom.activeUsers
        });

        console.log(`User ${socket.user.name} joined room ${roomId}`);
      } catch (error) {
        console.error('Join room error:', error);
        socket.emit('error', { message: 'Failed to join room' });
      }
    });

    // Handle leaving a chat room
    socket.on('leave-room', async (data) => {
      try {
        const { roomId } = data;
        
        // Leave the socket room
        socket.leave(roomId);
        
        // Remove from active users in database
        const chatRoom = await ChatRoom.findById(roomId);
        if (chatRoom) {
          chatRoom.removeActiveUser(socket.userId);
          await chatRoom.save();
          
          // Update local tracking
          const connection = activeConnections.get(socket.userId);
          if (connection) {
            connection.joinedRooms.delete(roomId);
          }

          // Populate updated room data
          await chatRoom.populate('activeUsers.user', 'name email avatar status');
          
          // Notify other users in the room
          socket.to(roomId).emit('user-left-room', {
            roomId,
            userId: socket.userId,
            activeUsers: chatRoom.activeUsers
          });
        }

        socket.emit('left-room', { roomId });
        console.log(`User ${socket.user.name} left room ${roomId}`);
      } catch (error) {
        console.error('Leave room error:', error);
        socket.emit('error', { message: 'Failed to leave room' });
      }
    });

    // Handle sending messages (for future implementation)
    socket.on('send-message', async (data) => {
      try {
        const { roomId, message } = data;
        
        const chatRoom = await ChatRoom.findById(roomId);
        if (!chatRoom || !chatRoom.isMember(socket.userId)) {
          socket.emit('error', { message: 'Cannot send message to this room' });
          return;
        }

        // Update last activity
        chatRoom.lastActivity = new Date();
        await chatRoom.save();

        // Broadcast message to all users in the room
        const messageData = {
          id: Date.now(), // Temporary ID, replace with proper message ID when implementing messages
          roomId,
          sender: {
            id: socket.user._id,
            name: socket.user.name,
            avatar: socket.user.avatar
          },
          content: message,
          timestamp: new Date()
        };

        io.to(roomId).emit('new-message', messageData);
        console.log(`Message sent in room ${roomId} by ${socket.user.name}`);
      } catch (error) {
        console.error('Send message error:', error);
        socket.emit('error', { message: 'Failed to send message' });
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

    // Handle typing indicators (for future implementation)
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
