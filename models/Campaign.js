const mongoose = require('mongoose');

const campaignSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    required: true
  },
  type: {
    type: String,
    enum: ['awareness', 'challenge', 'collection_drive', 'workshop', 'competition'],
    required: true
  },
  status: {
    type: String,
    enum: ['draft', 'active', 'paused', 'completed', 'cancelled'],
    default: 'draft'
  },
  startDate: {
    type: Date,
    required: true
  },
  endDate: {
    type: Date,
    required: true
  },
  targetAudience: [{
    type: String,
    enum: ['students', 'staff', 'residents', 'faculty', 'all']
  }],
  departments: [String],
  buildings: [String],
  goals: {
    targetItems: Number,
    targetWeight: Number, // in kg
    targetParticipants: Number,
    targetAwareness: Number // percentage
  },
  currentProgress: {
    itemsCollected: {
      type: Number,
      default: 0
    },
    weightCollected: {
      type: Number,
      default: 0
    },
    participants: {
      type: Number,
      default: 0
    },
    awarenessReached: {
      type: Number,
      default: 0
    }
  },
  rewards: [{
    name: String,
    description: String,
    criteria: String,
    value: Number,
    maxRecipients: Number,
    currentRecipients: {
      type: Number,
      default: 0
    }
  }],
  challenges: [{
    title: String,
    description: String,
    points: Number,
    difficulty: {
      type: String,
      enum: ['easy', 'medium', 'hard', 'expert']
    },
    participants: [{
      user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      },
      completedAt: Date,
      points: Number
    }]
  }],
  leaderboard: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    points: {
      type: Number,
      default: 0
    },
    itemsContributed: {
      type: Number,
      default: 0
    },
    weightContributed: {
      type: Number,
      default: 0
    },
    rank: Number
  }],
  content: {
    images: [String],
    videos: [String],
    documents: [String],
    socialMediaLinks: [String]
  },
  organizers: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    role: {
      type: String,
      enum: ['coordinator', 'volunteer', 'sponsor']
    }
  }],
  budget: {
    allocated: Number,
    spent: Number,
    currency: {
      type: String,
      default: 'USD'
    }
  },
  metrics: {
    views: {
      type: Number,
      default: 0
    },
    shares: {
      type: Number,
      default: 0
    },
    registrations: {
      type: Number,
      default: 0
    },
    engagement: {
      type: Number,
      default: 0
    }
  },
  feedback: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    rating: {
      type: Number,
      min: 1,
      max: 5
    },
    comment: String,
    date: {
      type: Date,
      default: Date.now
    }
  }],
  tags: [String],
  isPublic: {
    type: Boolean,
    default: true
  },
  requiresApproval: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

// Indexes for better query performance
campaignSchema.index({ status: 1 });
campaignSchema.index({ type: 1 });
campaignSchema.index({ startDate: 1 });
campaignSchema.index({ endDate: 1 });
campaignSchema.index({ targetAudience: 1 });
campaignSchema.index({ departments: 1 });

// Virtual for campaign duration
campaignSchema.virtual('duration').get(function() {
  const start = new Date(this.startDate);
  const end = new Date(this.endDate);
  return Math.ceil((end - start) / (1000 * 60 * 60 * 24));
});

// Virtual for campaign progress percentage
campaignSchema.virtual('progressPercentage').get(function() {
  if (!this.goals.targetItems) return 0;
  return Math.round((this.currentProgress.itemsCollected / this.goals.targetItems) * 100);
});

// Method to add participant
campaignSchema.methods.addParticipant = function(userId) {
  if (!this.currentProgress.participants.includes(userId)) {
    this.currentProgress.participants.push(userId);
  }
  return this.save();
};

// Method to update progress
campaignSchema.methods.updateProgress = function(items = 0, weight = 0) {
  this.currentProgress.itemsCollected += items;
  this.currentProgress.weightCollected += weight;
  return this.save();
};

// Method to calculate leaderboard
campaignSchema.methods.calculateLeaderboard = function() {
  // This would be implemented with aggregation pipeline in a real scenario
  this.leaderboard.sort((a, b) => b.points - a.points);
  
  // Update ranks
  this.leaderboard.forEach((entry, index) => {
    entry.rank = index + 1;
  });
  
  return this.save();
};

// Method to check if campaign is active
campaignSchema.methods.isActive = function() {
  const now = new Date();
  return this.status === 'active' && 
         now >= this.startDate && 
         now <= this.endDate;
};

// Method to check if user can participate
campaignSchema.methods.canUserParticipate = function(user) {
  if (!this.isActive()) return false;
  
  // Check if user is in target audience
  if (this.targetAudience.includes('all')) return true;
  
  if (this.targetAudience.includes(user.role)) return true;
  
  // Check department
  if (this.departments.length > 0 && user.department) {
    if (this.departments.includes(user.department)) return true;
  }
  
  // Check building
  if (this.buildings.length > 0 && user.building) {
    if (this.buildings.includes(user.building)) return true;
  }
  
  return false;
};

module.exports = mongoose.model('Campaign', campaignSchema);