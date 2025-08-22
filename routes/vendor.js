const express = require('express');
const { body, validationResult } = require('express-validator');
const auth = require('../middleware/auth');
const Vendor = require('../models/Vendor');
const EwasteItem = require('../models/EwasteItem');

const router = express.Router();

// @route   POST /api/vendor
// @desc    Create a new vendor
// @access  Private (Admin/Manager)
router.post('/', auth, [
  body('name', 'Name is required').notEmpty(),
  body('companyName', 'Company name is required').notEmpty(),
  body('email', 'Valid email is required').isEmail(),
  body('phone', 'Phone number is required').notEmpty(),
  body('services', 'At least one service is required').isArray({ min: 1 }),
  body('categories', 'At least one category is required').isArray({ min: 1 }),
  body('coverage.areas', 'Coverage areas are required').isArray({ min: 1 })
], async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    // Check permissions
    if (!['admin', 'manager'].includes(req.user.role)) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const vendor = new Vendor(req.body);
    await vendor.save();

    res.json(vendor);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: 'Server error' });
  }
});

// @route   GET /api/vendor
// @desc    Get all vendors with filtering
// @access  Private
router.get('/', auth, async (req, res) => {
  try {
    const {
      status,
      service,
      category,
      area,
      rating,
      page = 1,
      limit = 10
    } = req.query;

    // Build filter object
    const filter = {};
    if (status) filter.status = status;
    if (service) filter.services = service;
    if (category) filter.categories = category;
    if (area) filter['coverage.areas'] = area;
    if (rating) filter['rating.average'] = { $gte: parseFloat(rating) };

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const vendors = await Vendor.find(filter)
      .sort({ 'rating.average': -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Vendor.countDocuments(filter);

    res.json({
      vendors,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / parseInt(limit)),
        totalVendors: total,
        vendorsPerPage: parseInt(limit)
      }
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: 'Server error' });
  }
});

// @route   GET /api/vendor/:id
// @desc    Get vendor by ID
// @access  Private
router.get('/:id', auth, async (req, res) => {
  try {
    const vendor = await Vendor.findById(req.params.id);
    if (!vendor) {
      return res.status(404).json({ error: 'Vendor not found' });
    }

    res.json(vendor);
  } catch (err) {
    console.error(err.message);
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ error: 'Vendor not found' });
    }
    res.status(500).json({ error: 'Server error' });
  }
});

// @route   PUT /api/vendor/:id
// @desc    Update vendor
// @access  Private (Admin/Manager)
router.put('/:id', auth, [
  body('email').optional().isEmail(),
  body('status').optional().isIn(['active', 'inactive', 'suspended', 'pending_approval'])
], async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    // Check permissions
    if (!['admin', 'manager'].includes(req.user.role)) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const vendor = await Vendor.findByIdAndUpdate(
      req.params.id,
      { $set: req.body },
      { new: true, runValidators: true }
    );

    if (!vendor) {
      return res.status(404).json({ error: 'Vendor not found' });
    }

    res.json(vendor);
  } catch (err) {
    console.error(err.message);
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ error: 'Vendor not found' });
    }
    res.status(500).json({ error: 'Server error' });
  }
});

// @route   DELETE /api/vendor/:id
// @desc    Delete vendor (Admin only)
// @access  Private (Admin)
router.delete('/:id', auth, async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied' });
    }

    const vendor = await Vendor.findById(req.params.id);
    if (!vendor) {
      return res.status(404).json({ error: 'Vendor not found' });
    }

    // Check if vendor has assigned items
    const assignedItems = await EwasteItem.countDocuments({ vendor: req.params.id });
    if (assignedItems > 0) {
      return res.status(400).json({ 
        error: 'Cannot delete vendor with assigned e-waste items' 
      });
    }

    await Vendor.findByIdAndDelete(req.params.id);

    res.json({ message: 'Vendor deleted successfully' });
  } catch (err) {
    console.error(err.message);
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ error: 'Vendor not found' });
    }
    res.status(500).json({ error: 'Server error' });
  }
});

// @route   POST /api/vendor/:id/review
// @desc    Add review to vendor
// @access  Private
router.post('/:id/review', auth, [
  body('rating', 'Rating must be between 1 and 5').isInt({ min: 1, max: 5 }),
  body('comment', 'Comment is required').notEmpty()
], async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const vendor = await Vendor.findById(req.params.id);
    if (!vendor) {
      return res.status(404).json({ error: 'Vendor not found' });
    }

    await vendor.addReview(req.user.id, req.body.rating, req.body.comment);

    res.json(vendor);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: 'Server error' });
  }
});

// @route   GET /api/vendor/:id/performance
// @desc    Get vendor performance metrics
// @access  Private
router.get('/:id/performance', auth, async (req, res) => {
  try {
    const vendor = await Vendor.findById(req.params.id);
    if (!vendor) {
      return res.status(404).json({ error: 'Vendor not found' });
    }

    // Get items assigned to this vendor
    const assignedItems = await EwasteItem.find({ vendor: req.params.id });
    
    // Calculate performance metrics
    const totalItems = assignedItems.length;
    const processedItems = assignedItems.filter(item => 
      ['recycled', 'reused', 'disposed'].includes(item.status)
    ).length;
    
    const successRate = totalItems > 0 ? (processedItems / totalItems) * 100 : 0;
    
    // Calculate average processing time
    const processedItemsWithDates = assignedItems.filter(item => 
      item.disposalDate && item.pickupDate
    );
    
    let avgProcessingTime = 0;
    if (processedItemsWithDates.length > 0) {
      const totalDays = processedItemsWithDates.reduce((sum, item) => {
        const pickup = new Date(item.pickupDate);
        const disposal = new Date(item.disposalDate);
        return sum + Math.ceil((disposal - pickup) / (1000 * 60 * 60 * 24));
      }, 0);
      avgProcessingTime = totalDays / processedItemsWithDates.length;
    }

    // Get items by status
    const statusBreakdown = await EwasteItem.aggregate([
      { $match: { vendor: vendor._id } },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          totalWeight: { $sum: { $ifNull: ['$estimatedWeight', 0] } }
        }
      }
    ]);

    // Get monthly performance
    const monthlyPerformance = await EwasteItem.aggregate([
      { $match: { vendor: vendor._id } },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' }
          },
          itemsAssigned: { $sum: 1 },
          itemsProcessed: {
            $sum: {
              $cond: [
                { $in: ['$status', ['recycled', 'reused', 'disposed']] },
                1,
                0
              ]
            }
          },
          totalWeight: { $sum: { $ifNull: ['$estimatedWeight', 0] } }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } }
    ]);

    const performance = {
      vendor: {
        id: vendor._id,
        name: vendor.name,
        companyName: vendor.companyName
      },
      metrics: {
        totalItemsAssigned: totalItems,
        processedItems,
        successRate: Math.round(successRate * 100) / 100,
        avgProcessingTime: Math.round(avgProcessingTime * 100) / 100,
        totalWeightProcessed: assignedItems.reduce((sum, item) => 
          sum + (item.estimatedWeight || 0), 0
        )
      },
      statusBreakdown,
      monthlyPerformance
    };

    res.json(performance);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: 'Server error' });
  }
});

// @route   GET /api/vendor/search/available
// @desc    Search for available vendors based on criteria
// @access  Private
router.get('/search/available', auth, async (req, res) => {
  try {
    const {
      category,
      service,
      area,
      minRating = 0,
      maxDistance
    } = req.query;

    // Build filter object
    const filter = { status: 'active' };
    if (category) filter.categories = category;
    if (service) filter.services = service;
    if (area) filter['coverage.areas'] = area;
    if (minRating > 0) filter['rating.average'] = { $gte: parseFloat(minRating) };

    const vendors = await Vendor.find(filter)
      .sort({ 'rating.average': -1, 'performance.successRate': -1 })
      .limit(20);

    // Filter by distance if specified
    let availableVendors = vendors;
    if (maxDistance && area) {
      // Simple distance filtering (in real app, use proper geospatial queries)
      availableVendors = vendors.filter(vendor => 
        vendor.coverage.areas.includes(area)
      );
    }

    res.json({
      searchCriteria: { category, service, area, minRating, maxDistance },
      totalFound: availableVendors.length,
      vendors: availableVendors
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: 'Server error' });
  }
});

// @route   POST /api/vendor/:id/assign-item
// @desc    Assign e-waste item to vendor
// @access  Private (Manager/Admin)
router.post('/:id/assign-item', auth, [
  body('itemId', 'Item ID is required').notEmpty(),
  body('pickupDate', 'Pickup date is required').isISO8601()
], async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    // Check permissions
    if (!['admin', 'manager'].includes(req.user.role)) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const { itemId, pickupDate, notes } = req.body;

    const vendor = await Vendor.findById(req.params.id);
    if (!vendor) {
      return res.status(404).json({ error: 'Vendor not found' });
    }

    if (vendor.status !== 'active') {
      return res.status(400).json({ error: 'Vendor is not active' });
    }

    const item = await EwasteItem.findById(itemId);
    if (!item) {
      return res.status(404).json({ error: 'E-waste item not found' });
    }

    // Check if vendor can handle this category
    if (!vendor.canHandleCategory(item.category)) {
      return res.status(400).json({ 
        error: 'Vendor cannot handle this category of e-waste' 
      });
    }

    // Update item
    item.vendor = vendor._id;
    item.pickupDate = new Date(pickupDate);
    item.status = 'collected';
    
    // Add to timeline
    item.timeline.push({
      action: 'Vendor Assignment',
      status: 'collected',
      user: req.user.id,
      notes: `Assigned to vendor: ${vendor.companyName}. Pickup scheduled for ${pickupDate}. ${notes || ''}`
    });

    await item.save();

    // Update vendor performance
    vendor.performance.totalItemsProcessed += 1;
    if (item.estimatedWeight) {
      vendor.performance.totalWeightProcessed += item.estimatedWeight;
    }
    await vendor.save();

    res.json({
      message: 'Item assigned to vendor successfully',
      item,
      vendor: {
        id: vendor._id,
        name: vendor.name,
        companyName: vendor.companyName
      }
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;