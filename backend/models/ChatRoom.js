const mongoose = require('mongoose');

const chatRoomSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Chat room name is required'],
    trim: true,
    maxlength: [50, 'Chat room name cannot exceed 50 characters'],
    minlength: [3, 'Chat room name must be at least 3 characters']
  },
  description: {
    type: String,
    trim: true,
    maxlength: [200, 'Description cannot exceed 200 characters'],
    default: ''
  },
  type: {
    type: String,
    enum: ['public', 'private'],
    default: 'public'
  },
  creator: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  members: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    joinedAt: {
      type: Date,
      default: Date.now
    },
    role: {
      type: String,
      enum: ['admin', 'moderator', 'member'],
      default: 'member'
    }
  }],
  activeUsers: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    socketId: String,
    joinedAt: {
      type: Date,
      default: Date.now
    }
  }],
  maxMembers: {
    type: Number,
    default: 100,
    min: 2,
    max: 1000
  },
  isActive: {
    type: Boolean,
    default: true
  },
  settings: {
    allowInvites: {
      type: Boolean,
      default: true
    },
    requireApproval: {
      type: Boolean,
      default: false
    },
    allowFileSharing: {
      type: Boolean,
      default: true
    }
  },
  lastActivity: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Indexes for better performance
chatRoomSchema.index({ name: 1 });
chatRoomSchema.index({ creator: 1 });
chatRoomSchema.index({ 'members.user': 1 });
chatRoomSchema.index({ type: 1, isActive: 1 });

// Virtual for member count
chatRoomSchema.virtual('memberCount').get(function() {
  return this.members.length;
});

// Virtual for active user count
chatRoomSchema.virtual('activeUserCount').get(function() {
  return this.activeUsers.length;
});

// Method to check if user is a member
chatRoomSchema.methods.isMember = function(userId) {
  return this.members.some(member => member.user.toString() === userId.toString());
};

// Method to check if user is admin or moderator
chatRoomSchema.methods.isAdminOrModerator = function(userId) {
  const member = this.members.find(member => member.user.toString() === userId.toString());
  return member && (member.role === 'admin' || member.role === 'moderator');
};

// Method to add member
chatRoomSchema.methods.addMember = function(userId, role = 'member') {
  if (!this.isMember(userId)) {
    this.members.push({
      user: userId,
      role: role,
      joinedAt: new Date()
    });
  }
  return this;
};

// Method to remove member
chatRoomSchema.methods.removeMember = function(userId) {
  this.members = this.members.filter(member => member.user.toString() !== userId.toString());
  this.activeUsers = this.activeUsers.filter(activeUser => activeUser.user.toString() !== userId.toString());
  return this;
};

// Method to add active user
chatRoomSchema.methods.addActiveUser = function(userId, socketId) {
  // Remove existing entry if any
  this.activeUsers = this.activeUsers.filter(activeUser => 
    activeUser.user.toString() !== userId.toString()
  );
  
  // Add new entry
  this.activeUsers.push({
    user: userId,
    socketId: socketId,
    joinedAt: new Date()
  });
  
  this.lastActivity = new Date();
  return this;
};

// Method to remove active user
chatRoomSchema.methods.removeActiveUser = function(userId) {
  this.activeUsers = this.activeUsers.filter(activeUser => 
    activeUser.user.toString() !== userId.toString()
  );
  return this;
};

// Method to remove active user by socket ID
chatRoomSchema.methods.removeActiveUserBySocket = function(socketId) {
  this.activeUsers = this.activeUsers.filter(activeUser => 
    activeUser.socketId !== socketId
  );
  return this;
};

// Pre-save middleware to set creator as admin
chatRoomSchema.pre('save', function(next) {
  if (this.isNew) {
    // Make creator an admin member
    if (!this.isMember(this.creator)) {
      this.addMember(this.creator, 'admin');
    }
  }
  next();
});

// Ensure virtuals are included in JSON
chatRoomSchema.set('toJSON', { virtuals: true });
chatRoomSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('ChatRoom', chatRoomSchema);
