const mongoose = require('mongoose');

const ewasteItemSchema = new mongoose.Schema({
  qrCode: {
    type: String,
    required: true,
    unique: true
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  category: {
    type: String,
    enum: ['computer', 'mobile', 'battery', 'projector', 'lab_equipment', 'accessories', 'other'],
    required: true
  },
  subcategory: {
    type: String,
    trim: true
  },
  brand: {
    type: String,
    trim: true
  },
  model: {
    type: String,
    trim: true
  },
  serialNumber: {
    type: String,
    trim: true
  },
  age: {
    type: Number, // in years
    required: true
  },
  condition: {
    type: String,
    enum: ['excellent', 'good', 'fair', 'poor', 'broken'],
    required: true
  },
  classification: {
    type: String,
    enum: ['recyclable', 'reusable', 'hazardous', 'landfill'],
    required: true
  },
  status: {
    type: String,
    enum: ['reported', 'collected', 'assessed', 'recycled', 'reused', 'disposed', 'archived'],
    default: 'reported'
  },
  reportedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  department: {
    type: String,
    required: true
  },
  location: {
    building: String,
    room: String,
    floor: String
  },
  description: {
    type: String,
    trim: true
  },
  estimatedWeight: {
    type: Number, // in kg
    min: 0
  },
  estimatedValue: {
    type: Number, // in currency
    min: 0
  },
  hazardousMaterials: [{
    type: String,
    enum: ['lead', 'mercury', 'cadmium', 'brominated_flame_retardants', 'pvc', 'none']
  }],
  recyclingPotential: {
    type: Number, // percentage 0-100
    min: 0,
    max: 100
  },
  images: [{
    type: String // file paths
  }],
  documents: [{
    type: String // file paths
  }],
  notes: [{
    content: String,
    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    timestamp: {
      type: Date,
      default: Date.now
    }
  }],
  timeline: [{
    action: String,
    status: String,
    timestamp: {
      type: Date,
      default: Date.now
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    notes: String
  }],
  vendor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Vendor'
  },
  pickupDate: Date,
  disposalDate: Date,
  environmentalImpact: {
    co2Saved: Number, // in kg
    landfillSpaceSaved: Number, // in cubic meters
    toxicMaterialsPrevented: Number // in kg
  },
  tags: [String]
}, {
  timestamps: true
});

// Indexes for better query performance
ewasteItemSchema.index({ qrCode: 1 });
ewasteItemSchema.index({ status: 1 });
ewasteItemSchema.index({ category: 1 });
ewasteItemSchema.index({ department: 1 });
ewasteItemSchema.index({ reportedBy: 1 });
ewasteItemSchema.index({ createdAt: -1 });

// Virtual for age calculation
ewasteItemSchema.virtual('ageInYears').get(function() {
  if (this.age) return this.age;
  // Calculate age from creation date if not specified
  const now = new Date();
  const created = this.createdAt;
  return Math.floor((now - created) / (1000 * 60 * 60 * 24 * 365));
});

// Method to update status and add to timeline
ewasteItemSchema.methods.updateStatus = function(newStatus, userId, notes = '') {
  this.status = newStatus;
  this.timeline.push({
    action: 'Status Update',
    status: newStatus,
    user: userId,
    notes: notes,
    timestamp: new Date()
  });
  return this.save();
};

// Method to calculate environmental impact
ewasteItemSchema.methods.calculateEnvironmentalImpact = function() {
  // Simplified calculation based on category and weight
  const impactFactors = {
    computer: { co2: 50, landfill: 0.1, toxic: 0.5 },
    mobile: { co2: 10, landfill: 0.02, toxic: 0.1 },
    battery: { co2: 5, landfill: 0.01, toxic: 0.3 },
    projector: { co2: 30, landfill: 0.05, toxic: 0.2 },
    lab_equipment: { co2: 40, landfill: 0.08, toxic: 0.4 },
    accessories: { co2: 5, landfill: 0.01, toxic: 0.05 },
    other: { co2: 15, landfill: 0.03, toxic: 0.15 }
  };
  
  const factor = impactFactors[this.category] || impactFactors.other;
  const weight = this.estimatedWeight || 1;
  
  this.environmentalImpact = {
    co2Saved: Math.round(factor.co2 * weight),
    landfillSpaceSaved: Math.round(factor.landfill * weight * 100) / 100,
    toxicMaterialsPrevented: Math.round(factor.toxic * weight * 100) / 100
  };
  
  return this.save();
};

module.exports = mongoose.model('EwasteItem', ewasteItemSchema);