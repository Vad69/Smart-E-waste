const express = require('express');
const { body, validationResult } = require('express-validator');
const auth = require('../middleware/auth');
const EwasteItem = require('../models/EwasteItem');
const User = require('../models/User');
const QRCode = require('qrcode');
const path = require('path');
const fs = require('fs').promises;

const router = express.Router();

// @route   POST /api/ewaste
// @desc    Create a new e-waste item
// @access  Private
router.post('/', auth, [
  body('name', 'Name is required').notEmpty(),
  body('category', 'Valid category is required').isIn(['computer', 'mobile', 'battery', 'projector', 'lab_equipment', 'accessories', 'other']),
  body('age', 'Age is required and must be a number').isNumeric(),
  body('condition', 'Valid condition is required').isIn(['excellent', 'good', 'fair', 'poor', 'broken']),
  body('classification', 'Valid classification is required').isIn(['recyclable', 'reusable', 'hazardous', 'landfill']),
  body('department', 'Department is required').notEmpty(),
  body('estimatedWeight', 'Weight must be a positive number').optional().isFloat({ min: 0 }),
  body('estimatedValue', 'Value must be a positive number').optional().isFloat({ min: 0 })
], async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const {
      name, category, subcategory, brand, model, serialNumber, age, condition,
      classification, department, location, description, estimatedWeight,
      estimatedValue, hazardousMaterials, recyclingPotential, tags
    } = req.body;

    // Generate unique QR code
    const qrCode = `EW-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    // Create QR code image
    const qrCodePath = path.join(__dirname, '../qr-codes', `${qrCode}.png`);
    await QRCode.toFile(qrCodePath, qrCode, {
      width: parseInt(process.env.QR_CODE_SIZE) || 200,
      margin: parseInt(process.env.QR_CODE_MARGIN) || 2
    });

    // Create new e-waste item
    const ewasteItem = new EwasteItem({
      qrCode,
      name,
      category,
      subcategory,
      brand,
      model,
      serialNumber,
      age,
      condition,
      classification,
      reportedBy: req.user.id,
      department,
      location,
      description,
      estimatedWeight,
      estimatedValue,
      hazardousMaterials,
      recyclingPotential,
      tags
    });

    // Add initial timeline entry
    ewasteItem.timeline.push({
      action: 'Item Reported',
      status: 'reported',
      user: req.user.id,
      notes: 'E-waste item reported by user'
    });

    await ewasteItem.save();

    // Calculate environmental impact
    await ewasteItem.calculateEnvironmentalImpact();

    // Update user's contribution stats
    const user = await User.findById(req.user.id);
    user.totalEwasteContributed += 1;
    user.updateGreenScore();
    await user.save();

    res.json(ewasteItem);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: 'Server error' });
  }
});

// @route   GET /api/ewaste
// @desc    Get all e-waste items with filtering and pagination
// @access  Private
router.get('/', auth, async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      status,
      category,
      department,
      classification,
      search,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    // Build filter object
    const filter = {};
    if (status) filter.status = status;
    if (category) filter.category = category;
    if (department) filter.department = department;
    if (classification) filter.classification = classification;
    
    // Search functionality
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { brand: { $regex: search, $options: 'i' } },
        { model: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }

    // Role-based filtering
    if (req.user.role === 'resident') {
      filter['location.building'] = req.user.building;
    } else if (req.user.role === 'staff' || req.user.role === 'student') {
      filter.department = req.user.department;
    }

    // Build sort object
    const sort = {};
    sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const items = await EwasteItem.find(filter)
      .populate('reportedBy', 'username email')
      .populate('vendor', 'name companyName')
      .sort(sort)
      .skip(skip)
      .limit(parseInt(limit));

    const total = await EwasteItem.countDocuments(filter);

    res.json({
      items,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / parseInt(limit)),
        totalItems: total,
        itemsPerPage: parseInt(limit)
      }
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: 'Server error' });
  }
});

// @route   GET /api/ewaste/:id
// @desc    Get e-waste item by ID
// @access  Private
router.get('/:id', auth, async (req, res) => {
  try {
    const item = await EwasteItem.findById(req.params.id)
      .populate('reportedBy', 'username email role department building')
      .populate('vendor', 'name companyName phone email')
      .populate('notes.author', 'username')
      .populate('timeline.user', 'username role');

    if (!item) {
      return res.status(404).json({ error: 'E-waste item not found' });
    }

    // Check access permissions
    if (req.user.role === 'resident' && item.location.building !== req.user.building) {
      return res.status(403).json({ error: 'Access denied' });
    }

    if ((req.user.role === 'staff' || req.user.role === 'student') && 
        item.department !== req.user.department) {
      return res.status(403).json({ error: 'Access denied' });
    }

    res.json(item);
  } catch (err) {
    console.error(err.message);
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ error: 'E-waste item not found' });
    }
    res.status(500).json({ error: 'Server error' });
  }
});

// @route   PUT /api/ewaste/:id
// @desc    Update e-waste item
// @access  Private (Manager/Admin)
router.put('/:id', auth, [
  body('status').optional().isIn(['reported', 'collected', 'assessed', 'recycled', 'reused', 'disposed', 'archived']),
  body('classification').optional().isIn(['recyclable', 'reusable', 'hazardous', 'landfill']),
  body('recyclingPotential').optional().isFloat({ min: 0, max: 100 }),
  body('estimatedWeight').optional().isFloat({ min: 0 }),
  body('estimatedValue').optional().isFloat({ min: 0 })
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

    const item = await EwasteItem.findById(req.params.id);
    if (!item) {
      return res.status(404).json({ error: 'E-waste item not found' });
    }

    const updateFields = req.body;
    const notes = updateFields.notes || '';

    // Update status if changed
    if (updateFields.status && updateFields.status !== item.status) {
      await item.updateStatus(updateFields.status, req.user.id, notes);
    }

    // Remove fields that shouldn't be updated directly
    delete updateFields.status;
    delete updateFields.notes;

    // Update other fields
    Object.keys(updateFields).forEach(key => {
      if (updateFields[key] !== undefined) {
        item[key] = updateFields[key];
      }
    });

    // Recalculate environmental impact if weight changed
    if (updateFields.estimatedWeight) {
      await item.calculateEnvironmentalImpact();
    }

    await item.save();

    res.json(item);
  } catch (err) {
    console.error(err.message);
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ error: 'E-waste item not found' });
    }
    res.status(500).json({ error: 'Server error' });
  }
});

// @route   POST /api/ewaste/:id/notes
// @desc    Add note to e-waste item
// @access  Private
router.post('/:id/notes', auth, [
  body('content', 'Note content is required').notEmpty()
], async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const item = await EwasteItem.findById(req.params.id);
    if (!item) {
      return res.status(404).json({ error: 'E-waste item not found' });
    }

    item.notes.push({
      content: req.body.content,
      author: req.user.id,
      timestamp: new Date()
    });

    await item.save();

    res.json(item);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: 'Server error' });
  }
});

// @route   DELETE /api/ewaste/:id
// @desc    Delete e-waste item (Admin only)
// @access  Private (Admin)
router.delete('/:id', auth, async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied' });
    }

    const item = await EwasteItem.findById(req.params.id);
    if (!item) {
      return res.status(404).json({ error: 'E-waste item not found' });
    }

    // Delete QR code file
    try {
      const qrCodePath = path.join(__dirname, '../qr-codes', `${item.qrCode}.png`);
      await fs.unlink(qrCodePath);
    } catch (err) {
      console.log('QR code file not found or already deleted');
    }

    await EwasteItem.findByIdAndDelete(req.params.id);

    res.json({ message: 'E-waste item deleted successfully' });
  } catch (err) {
    console.error(err.message);
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ error: 'E-waste item not found' });
    }
    res.status(500).json({ error: 'Server error' });
  }
});

// @route   GET /api/ewaste/qr/:qrCode
// @desc    Get e-waste item by QR code
// @access  Public (for QR scanning)
router.get('/qr/:qrCode', async (req, res) => {
  try {
    const item = await EwasteItem.findOne({ qrCode: req.params.qrCode })
      .populate('reportedBy', 'username department building')
      .populate('vendor', 'name companyName');

    if (!item) {
      return res.status(404).json({ error: 'E-waste item not found' });
    }

    res.json(item);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: 'Server error' });
  }
});

// @route   POST /api/ewaste/:id/status-update
// @desc    Update status with notes
// @access  Private (Manager/Admin)
router.post('/:id/status-update', auth, [
  body('status', 'Valid status is required').isIn(['reported', 'collected', 'assessed', 'recycled', 'reused', 'disposed', 'archived']),
  body('notes', 'Notes are required').notEmpty()
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

    const item = await EwasteItem.findById(req.params.id);
    if (!item) {
      return res.status(404).json({ error: 'E-waste item not found' });
    }

    await item.updateStatus(req.body.status, req.user.id, req.body.notes);

    res.json(item);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;