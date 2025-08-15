const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    minlength: 3,
    maxlength: 30
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  password: {
    type: String,
    required: true,
    minlength: 6
  },
  role: {
    type: String,
    enum: ['admin', 'manager', 'staff', 'student', 'resident'],
    default: 'resident'
  },
  department: {
    type: String,
    required: function() { return ['staff', 'student'].includes(this.role); }
  },
  building: {
    type: String,
    required: function() { return ['resident'].includes(this.role); }
  },
  room: {
    type: String
  },
  phone: {
    type: String,
    trim: true
  },
  greenScore: {
    type: Number,
    default: 0
  },
  totalEwasteContributed: {
    type: Number,
    default: 0
  },
  isActive: {
    type: Boolean,
    default: true
  },
  lastLogin: {
    type: Date
  },
  profilePicture: {
    type: String
  }
}, {
  timestamps: true
});

// Hash password before saving
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  try {
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Compare password method
userSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// Calculate green score based on contributions
userSchema.methods.updateGreenScore = function() {
  // Base score + contribution bonus
  this.greenScore = Math.floor(this.totalEwasteContributed * 10);
  return this.greenScore;
};

module.exports = mongoose.model('User', userSchema);