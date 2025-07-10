const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  content: {
    type: String,
    required: [true, 'Message content is required'],
    trim: true,
    maxlength: [2000, 'Message cannot exceed 2000 characters'],
    minlength: [1, 'Message cannot be empty']
  },
  sender: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Message sender is required']
  },
  chatRoom: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ChatRoom',
    required: [true, 'Chat room is required']
  },
  messageType: {
    type: String,
    enum: ['text', 'image', 'file', 'system'],
    default: 'text'
  },
  replyTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Message',
    default: null
  },
  edited: {
    isEdited: {
      type: Boolean,
      default: false
    },
    editedAt: {
      type: Date,
      default: null
    },
    originalContent: {
      type: String,
      default: null
    }
  },
  reactions: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    emoji: {
      type: String,
      required: true,
      maxlength: 10
    },
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],
  attachments: [{
    fileName: {
      type: String,
      required: true
    },
    fileUrl: {
      type: String,
      required: true
    },
    fileType: {
      type: String,
      required: true
    },
    fileSize: {
      type: Number,
      required: true
    }
  }],
  mentions: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    startIndex: Number,
    endIndex: Number
  }],
  isDeleted: {
    type: Boolean,
    default: false
  },
  deletedAt: {
    type: Date,
    default: null
  },
  deletedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  readBy: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    readAt: {
      type: Date,
      default: Date.now
    }
  }],
  metadata: {
    ipAddress: String,
    userAgent: String,
    platform: String
  }
}, {
  timestamps: true
});

// Indexes for better performance
messageSchema.index({ chatRoom: 1, createdAt: -1 });
messageSchema.index({ sender: 1, createdAt: -1 });
messageSchema.index({ chatRoom: 1, isDeleted: 1, createdAt: -1 });
messageSchema.index({ 'mentions.user': 1 });

// Virtual for reply count (if this message is replied to)
messageSchema.virtual('replyCount', {
  ref: 'Message',
  localField: '_id',
  foreignField: 'replyTo',
  count: true
});

// Virtual for reaction summary
messageSchema.virtual('reactionSummary').get(function() {
  const summary = {};
  if (this.reactions && Array.isArray(this.reactions)) {
    this.reactions.forEach(reaction => {
      if (summary[reaction.emoji]) {
        summary[reaction.emoji].count++;
        summary[reaction.emoji].users.push(reaction.user);
      } else {
        summary[reaction.emoji] = {
          count: 1,
          users: [reaction.user]
        };
      }
    });
  }
  return summary;
});

// Method to check if user has read the message
messageSchema.methods.isReadBy = function(userId) {
  return this.readBy.some(read => read.user.toString() === userId.toString());
};

// Method to mark message as read by user
messageSchema.methods.markAsRead = function(userId) {
  if (!this.isReadBy(userId)) {
    this.readBy.push({
      user: userId,
      readAt: new Date()
    });
  }
  return this;
};

// Method to add reaction
messageSchema.methods.addReaction = function(userId, emoji) {
  // Remove existing reaction from this user
  this.reactions = this.reactions.filter(reaction => 
    reaction.user.toString() !== userId.toString() || reaction.emoji !== emoji
  );
  
  // Add new reaction
  this.reactions.push({
    user: userId,
    emoji: emoji,
    createdAt: new Date()
  });
  
  return this;
};

// Method to remove reaction
messageSchema.methods.removeReaction = function(userId, emoji) {
  this.reactions = this.reactions.filter(reaction => 
    !(reaction.user.toString() === userId.toString() && reaction.emoji === emoji)
  );
  return this;
};

// Method to edit message
messageSchema.methods.editMessage = function(newContent) {
  if (!this.edited.isEdited) {
    this.edited.originalContent = this.content;
  }
  
  this.content = newContent;
  this.edited.isEdited = true;
  this.edited.editedAt = new Date();
  
  return this;
};

// Method to soft delete message
messageSchema.methods.softDelete = function(deletedBy) {
  this.isDeleted = true;
  this.deletedAt = new Date();
  this.deletedBy = deletedBy;
  return this;
};

// Pre-save middleware to update chat room's last activity
messageSchema.pre('save', async function(next) {
  if (this.isNew && !this.isDeleted) {
    try {
      const ChatRoom = mongoose.model('ChatRoom');
      await ChatRoom.findByIdAndUpdate(this.chatRoom, {
        lastActivity: new Date()
      });
    } catch (error) {
      console.error('Error updating chat room last activity:', error);
    }
  }
  next();
});

// Static method to get messages for a chat room with pagination
messageSchema.statics.getMessagesForRoom = function(roomId, page = 1, limit = 50) {
  const skip = (page - 1) * limit;
  
  return this.find({
    chatRoom: roomId,
    isDeleted: false
  })
    .populate('sender', 'name email avatar status')
    .populate('replyTo', 'content sender createdAt')
    .populate('reactions.user', 'name avatar')
    .populate('mentions.user', 'name avatar')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .lean();
};

// Static method to get unread message count for user in room
messageSchema.statics.getUnreadCount = function(roomId, userId) {
  return this.countDocuments({
    chatRoom: roomId,
    isDeleted: false,
    'readBy.user': { $ne: userId }
  });
};

// Ensure virtuals are included in JSON
messageSchema.set('toJSON', { virtuals: true });
messageSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('Message', messageSchema);
