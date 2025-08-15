const mongoose = require('mongoose');

const vendorSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  companyName: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    lowercase: true,
    trim: true
  },
  phone: {
    type: String,
    required: true,
    trim: true
  },
  address: {
    street: String,
    city: String,
    state: String,
    zipCode: String,
    country: String
  },
  services: [{
    type: String,
    enum: ['recycling', 'refurbishment', 'disposal', 'data_destruction', 'certification']
  }],
  certifications: [{
    name: String,
    issuingBody: String,
    validUntil: Date,
    certificateNumber: String
  }],
  categories: [{
    type: String,
    enum: ['computer', 'mobile', 'battery', 'projector', 'lab_equipment', 'accessories', 'other']
  }],
  capacity: {
    monthly: Number, // in kg
    yearly: Number // in kg
  },
  pricing: {
    perKg: Number,
    perItem: Number,
    minimumCharge: Number
  },
  coverage: {
    areas: [String],
    radius: Number // in km
  },
  availability: {
    days: [{
      type: String,
      enum: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']
    }],
    hours: {
      start: String, // HH:MM format
      end: String
    },
    emergencyPickup: Boolean
  },
  rating: {
    average: {
      type: Number,
      default: 0,
      min: 0,
      max: 5
    },
    totalReviews: {
      type: Number,
      default: 0
    },
    reviews: [{
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
    }]
  },
  status: {
    type: String,
    enum: ['active', 'inactive', 'suspended', 'pending_approval'],
    default: 'pending_approval'
  },
  documents: [{
    name: String,
    type: String,
    url: String,
    uploadedAt: {
      type: Date,
      default: Date.now
    }
  }],
  insurance: {
    provider: String,
    policyNumber: String,
    coverageAmount: Number,
    validUntil: Date
  },
  environmentalCompliance: {
    permits: [{
      name: String,
      number: String,
      validUntil: Date
    }],
    certifications: [{
      name: String,
      issuingBody: String,
      validUntil: Date
    }]
  },
  performance: {
    totalItemsProcessed: {
      type: Number,
      default: 0
    },
    totalWeightProcessed: {
      type: Number,
      default: 0
    },
    averageProcessingTime: Number, // in days
    successRate: {
      type: Number,
      min: 0,
      max: 100,
      default: 0
    }
  },
  notes: String,
  contactPerson: {
    name: String,
    position: String,
    phone: String,
    email: String
  }
}, {
  timestamps: true
});

// Indexes for better query performance
vendorSchema.index({ status: 1 });
vendorSchema.index({ categories: 1 });
vendorSchema.index({ services: 1 });
vendorSchema.index({ 'coverage.areas': 1 });
vendorSchema.index({ rating: -1 });

// Method to calculate average rating
vendorSchema.methods.calculateAverageRating = function() {
  if (this.rating.reviews.length === 0) {
    this.rating.average = 0;
    return 0;
  }
  
  const totalRating = this.rating.reviews.reduce((sum, review) => sum + review.rating, 0);
  this.rating.average = Math.round((totalRating / this.rating.reviews.length) * 10) / 10;
  this.rating.totalReviews = this.rating.reviews.length;
  
  return this.rating.average;
};

// Method to add review
vendorSchema.methods.addReview = function(userId, rating, comment) {
  this.rating.reviews.push({
    user: userId,
    rating: rating,
    comment: comment,
    date: new Date()
  });
  
  this.calculateAverageRating();
  return this.save();
};

// Method to check if vendor can handle category
vendorSchema.methods.canHandleCategory = function(category) {
  return this.categories.includes(category);
};

// Method to check if vendor provides service
vendorSchema.methods.providesService = function(service) {
  return this.services.includes(service);
};

// Method to check if vendor covers area
vendorSchema.methods.coversArea = function(area) {
  return this.coverage.areas.includes(area);
};

module.exports = mongoose.model('Vendor', vendorSchema);