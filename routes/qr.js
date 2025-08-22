const express = require('express');
const QRCode = require('qrcode');
const path = require('path');
const fs = require('fs').promises;
const auth = require('../middleware/auth');
const EwasteItem = require('../models/EwasteItem');

const router = express.Router();

// @route   GET /api/qr/generate/:itemId
// @desc    Generate QR code for e-waste item
// @access  Private
router.get('/generate/:itemId', auth, async (req, res) => {
  try {
    const item = await EwasteItem.findById(req.params.itemId);
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

    // Generate QR code if it doesn't exist
    if (!item.qrCode) {
      const qrCode = `EW-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      item.qrCode = qrCode;
      await item.save();
    }

    // Create QR code image
    const qrCodePath = path.join(__dirname, '../qr-codes', `${item.qrCode}.png`);
    
    try {
      await fs.access(qrCodePath);
    } catch (err) {
      // QR code image doesn't exist, create it
      await QRCode.toFile(qrCodePath, item.qrCode, {
        width: parseInt(process.env.QR_CODE_SIZE) || 200,
        margin: parseInt(process.env.QR_CODE_MARGIN) || 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        }
      });
    }

    res.json({
      qrCode: item.qrCode,
      qrCodeUrl: `/qr-codes/${item.qrCode}.png`,
      item: {
        id: item._id,
        name: item.name,
        category: item.category,
        status: item.status
      }
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: 'Server error' });
  }
});

// @route   GET /api/qr/scan/:qrCode
// @desc    Scan QR code and get item details
// @access  Public (for QR scanning)
router.get('/scan/:qrCode', async (req, res) => {
  try {
    const { qrCode } = req.params;

    const item = await EwasteItem.findOne({ qrCode })
      .populate('reportedBy', 'username role department building')
      .populate('vendor', 'name companyName phone email');

    if (!item) {
      return res.status(404).json({ error: 'E-waste item not found' });
    }

    // Return public information
    const publicInfo = {
      qrCode: item.qrCode,
      name: item.name,
      category: item.category,
      status: item.status,
      reportedBy: {
        username: item.reportedBy.username,
        role: item.reportedBy.role,
        department: item.reportedBy.department,
        building: item.reportedBy.building
      },
      location: item.location,
      description: item.description,
      estimatedWeight: item.estimatedWeight,
      classification: item.classification,
      hazardousMaterials: item.hazardousMaterials,
      recyclingPotential: item.recyclingPotential,
      timeline: item.timeline.map(entry => ({
        action: entry.action,
        status: entry.status,
        timestamp: entry.timestamp,
        notes: entry.notes
      })),
      vendor: item.vendor ? {
        name: item.vendor.name,
        companyName: item.vendor.companyName,
        phone: item.vendor.phone,
        email: item.vendor.email
      } : null,
      environmentalImpact: item.environmentalImpact,
      createdAt: item.createdAt,
      lastUpdated: item.updatedAt
    };

    res.json(publicInfo);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: 'Server error' });
  }
});

// @route   POST /api/qr/bulk-generate
// @desc    Generate QR codes for multiple items
// @access  Private (Manager/Admin)
router.post('/bulk-generate', auth, async (req, res) => {
  try {
    // Check permissions
    if (!['admin', 'manager'].includes(req.user.role)) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const { itemIds } = req.body;

    if (!Array.isArray(itemIds) || itemIds.length === 0) {
      return res.status(400).json({ error: 'Item IDs array is required' });
    }

    const items = await EwasteItem.find({ _id: { $in: itemIds } });
    const generatedCodes = [];

    for (const item of items) {
      if (!item.qrCode) {
        // Generate new QR code
        const qrCode = `EW-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        item.qrCode = qrCode;
        
        // Create QR code image
        const qrCodePath = path.join(__dirname, '../qr-codes', `${qrCode}.png`);
        await QRCode.toFile(qrCodePath, qrCode, {
          width: parseInt(process.env.QR_CODE_SIZE) || 200,
          margin: parseInt(process.env.QR_CODE_MARGIN) || 2
        });

        await item.save();
        generatedCodes.push({
          itemId: item._id,
          qrCode: qrCode,
          qrCodeUrl: `/qr-codes/${qrCode}.png`
        });
      } else {
        generatedCodes.push({
          itemId: item._id,
          qrCode: item.qrCode,
          qrCodeUrl: `/qr-codes/${item.qrCode}.png`,
          alreadyExists: true
        });
      }
    }

    res.json({
      message: 'QR codes generated successfully',
      generatedCodes
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: 'Server error' });
  }
});

// @route   GET /api/qr/download/:qrCode
// @desc    Download QR code image
// @access  Private
router.get('/download/:qrCode', auth, async (req, res) => {
  try {
    const { qrCode } = req.params;

    const item = await EwasteItem.findOne({ qrCode });
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

    const qrCodePath = path.join(__dirname, '../qr-codes', `${qrCode}.png`);
    
    try {
      await fs.access(qrCodePath);
    } catch (err) {
      return res.status(404).json({ error: 'QR code image not found' });
    }

    res.download(qrCodePath, `${qrCode}.png`);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: 'Server error' });
  }
});

// @route   GET /api/qr/validate/:qrCode
// @desc    Validate QR code format and check if it exists
// @access  Public
router.get('/validate/:qrCode', async (req, res) => {
  try {
    const { qrCode } = req.params;

    // Check QR code format
    const qrCodePattern = /^EW-\d{13}-[a-z0-9]{9}$/;
    if (!qrCodePattern.test(qrCode)) {
      return res.json({
        valid: false,
        error: 'Invalid QR code format'
      });
    }

    // Check if QR code exists in database
    const item = await EwasteItem.findOne({ qrCode });
    if (!item) {
      return res.json({
        valid: false,
        error: 'QR code not found in database'
      });
    }

    // Check if QR code image exists
    const qrCodePath = path.join(__dirname, '../qr-codes', `${qrCode}.png`);
    let imageExists = false;
    
    try {
      await fs.access(qrCodePath);
      imageExists = true;
    } catch (err) {
      imageExists = false;
    }

    res.json({
      valid: true,
      item: {
        id: item._id,
        name: item.name,
        category: item.category,
        status: item.status
      },
      imageExists
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: 'Server error' });
  }
});

// @route   POST /api/qr/regenerate/:itemId
// @desc    Regenerate QR code for an item
// @access  Private (Manager/Admin)
router.post('/regenerate/:itemId', auth, async (req, res) => {
  try {
    // Check permissions
    if (!['admin', 'manager'].includes(req.user.role)) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const item = await EwasteItem.findById(req.params.itemId);
    if (!item) {
      return res.status(404).json({ error: 'E-waste item not found' });
    }

    // Delete old QR code image if it exists
    if (item.qrCode) {
      try {
        const oldQrCodePath = path.join(__dirname, '../qr-codes', `${item.qrCode}.png`);
        await fs.unlink(oldQrCodePath);
      } catch (err) {
        console.log('Old QR code image not found or already deleted');
      }
    }

    // Generate new QR code
    const newQrCode = `EW-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    item.qrCode = newQrCode;

    // Create new QR code image
    const qrCodePath = path.join(__dirname, '../qr-codes', `${newQrCode}.png`);
    await QRCode.toFile(qrCodePath, newQrCode, {
      width: parseInt(process.env.QR_CODE_SIZE) || 200,
      margin: parseInt(process.env.QR_CODE_MARGIN) || 2
    });

    // Add to timeline
    item.timeline.push({
      action: 'QR Code Regenerated',
      status: item.status,
      user: req.user.id,
      notes: `QR code regenerated from ${item.qrCode} to ${newQrCode}`
    });

    await item.save();

    res.json({
      message: 'QR code regenerated successfully',
      oldQrCode: item.qrCode,
      newQrCode: newQrCode,
      qrCodeUrl: `/qr-codes/${newQrCode}.png`
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: 'Server error' });
  }
});

// @route   GET /api/qr/stats
// @desc    Get QR code statistics
// @access  Private (Manager/Admin)
router.get('/stats', auth, async (req, res) => {
  try {
    // Check permissions
    if (!['admin', 'manager'].includes(req.user.role)) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Get total items
    const totalItems = await EwasteItem.countDocuments();
    
    // Get items with QR codes
    const itemsWithQr = await EwasteItem.countDocuments({ qrCode: { $exists: true, $ne: null } });
    
    // Get items without QR codes
    const itemsWithoutQr = totalItems - itemsWithQr;

    // Get QR code usage by status
    const qrUsageByStatus = await EwasteItem.aggregate([
      { $match: { qrCode: { $exists: true, $ne: null } } },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);

    // Get QR code usage by category
    const qrUsageByCategory = await EwasteItem.aggregate([
      { $match: { qrCode: { $exists: true, $ne: null } } },
      {
        $group: {
          _id: '$category',
          count: { $sum: 1 }
        }
      }
    ]);

    // Check QR code image files
    const qrCodesDir = path.join(__dirname, '../qr-codes');
    let imageFilesCount = 0;
    
    try {
      const files = await fs.readdir(qrCodesDir);
      imageFilesCount = files.filter(file => file.endsWith('.png')).length;
    } catch (err) {
      imageFilesCount = 0;
    }

    const stats = {
      totalItems,
      itemsWithQr,
      itemsWithoutQr,
      qrCodeCoverage: totalItems > 0 ? Math.round((itemsWithQr / totalItems) * 100) : 0,
      imageFilesCount,
      qrUsageByStatus,
      qrUsageByCategory
    };

    res.json(stats);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;