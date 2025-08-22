const express = require('express');
const auth = require('../middleware/auth');
const EwasteItem = require('../models/EwasteItem');
const User = require('../models/User');
const Campaign = require('../models/Campaign');
const Vendor = require('../models/Vendor');
const moment = require('moment');

const router = express.Router();

// @route   GET /api/analytics/overview
// @desc    Get overview statistics
// @access  Private
router.get('/overview', auth, async (req, res) => {
  try {
    const now = moment();
    const startOfMonth = moment().startOf('month');
    const startOfYear = moment().startOf('year');

    // Total counts
    const totalItems = await EwasteItem.countDocuments();
    const totalUsers = await User.countDocuments({ isActive: true });
    const totalVendors = await Vendor.countDocuments({ status: 'active' });

    // Monthly statistics
    const monthlyItems = await EwasteItem.countDocuments({
      createdAt: { $gte: startOfMonth.toDate() }
    });

    // Yearly statistics
    const yearlyItems = await EwasteItem.countDocuments({
      createdAt: { $gte: startOfYear.toDate() }
    });

    // Status distribution
    const statusStats = await EwasteItem.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);

    // Category distribution
    const categoryStats = await EwasteItem.aggregate([
      {
        $group: {
          _id: '$category',
          count: { $sum: 1 },
          totalWeight: { $sum: { $ifNull: ['$estimatedWeight', 0] } }
        }
      }
    ]);

    // Department contribution
    const departmentStats = await EwasteItem.aggregate([
      {
        $group: {
          _id: '$department',
          count: { $sum: 1 },
          totalWeight: { $sum: { $ifNull: ['$estimatedWeight', 0] } }
        }
      },
      { $sort: { count: -1 } },
      { $limit: 10 }
    ]);

    // Environmental impact totals
    const environmentalImpact = await EwasteItem.aggregate([
      {
        $group: {
          _id: null,
          totalCO2Saved: { $sum: { $ifNull: ['$environmentalImpact.co2Saved', 0] } },
          totalLandfillSaved: { $sum: { $ifNull: ['$environmentalImpact.landfillSpaceSaved', 0] } },
          totalToxicPrevented: { $sum: { $ifNull: ['$environmentalImpact.toxicMaterialsPrevented', 0] } }
        }
      }
    ]);

    // Top contributors
    const topContributors = await User.aggregate([
      { $match: { isActive: true } },
      {
        $project: {
          username: 1,
          role: 1,
          department: 1,
          building: 1,
          greenScore: 1,
          totalEwasteContributed: 1
        }
      },
      { $sort: { totalEwasteContributed: -1 } },
      { $limit: 10 }
    ]);

    res.json({
      overview: {
        totalItems,
        totalUsers,
        totalVendors,
        monthlyItems,
        yearlyItems
      },
      statusDistribution: statusStats,
      categoryDistribution: categoryStats,
      departmentContribution: departmentStats,
      environmentalImpact: environmentalImpact[0] || {
        totalCO2Saved: 0,
        totalLandfillSaved: 0,
        totalToxicPrevented: 0
      },
      topContributors
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: 'Server error' });
  }
});

// @route   GET /api/analytics/trends
// @desc    Get e-waste trends over time
// @access  Private
router.get('/trends', auth, async (req, res) => {
  try {
    const { period = 'monthly', startDate, endDate } = req.query;
    
    let dateFilter = {};
    if (startDate && endDate) {
      dateFilter = {
        createdAt: {
          $gte: new Date(startDate),
          $lte: new Date(endDate)
        }
      };
    } else {
      // Default to last 12 months
      const end = moment();
      const start = moment().subtract(12, 'months');
      dateFilter = {
        createdAt: {
          $gte: start.toDate(),
          $lte: end.toDate()
        }
      };
    }

    let groupBy;
    let dateFormat;
    
    switch (period) {
      case 'daily':
        groupBy = { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } };
        dateFormat = 'YYYY-MM-DD';
        break;
      case 'weekly':
        groupBy = { $dateToString: { format: '%Y-W%U', date: '$createdAt' } };
        dateFormat = 'YYYY-[W]WW';
        break;
      case 'monthly':
      default:
        groupBy = { $dateToString: { format: '%Y-%m', date: '$createdAt' } };
        dateFormat = 'YYYY-MM';
        break;
    }

    // Items over time
    const itemsOverTime = await EwasteItem.aggregate([
      { $match: dateFilter },
      {
        $group: {
          _id: groupBy,
          count: { $sum: 1 },
          totalWeight: { $sum: { $ifNull: ['$estimatedWeight', 0] } },
          avgWeight: { $avg: { $ifNull: ['$estimatedWeight', 0] } }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    // Category trends
    const categoryTrends = await EwasteItem.aggregate([
      { $match: dateFilter },
      {
        $group: {
          _id: {
            period: groupBy,
            category: '$category'
          },
          count: { $sum: 1 },
          totalWeight: { $sum: { $ifNull: ['$estimatedWeight', 0] } }
        }
      },
      { $sort: { '_id.period': 1, '_id.category': 1 } }
    ]);

    // Status trends
    const statusTrends = await EwasteItem.aggregate([
      { $match: dateFilter },
      {
        $group: {
          _id: {
            period: groupBy,
            status: '$status'
          },
          count: { $sum: 1 }
        }
      },
      { $sort: { '_id.period': 1, '_id.status': 1 } }
    ]);

    // Department trends
    const departmentTrends = await EwasteItem.aggregate([
      { $match: dateFilter },
      {
        $group: {
          _id: {
            period: groupBy,
            department: '$department'
          },
          count: { $sum: 1 },
          totalWeight: { $sum: { $ifNull: ['$estimatedWeight', 0] } }
        }
      },
      { $sort: { '_id.period': 1, '_id.department': 1 } }
    ]);

    res.json({
      period,
      dateFilter: {
        start: dateFilter.createdAt?.$gte || null,
        end: dateFilter.createdAt?.$lte || null
      },
      itemsOverTime,
      categoryTrends,
      statusTrends,
      departmentTrends
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: 'Server error' });
  }
});

// @route   GET /api/analytics/environmental-impact
// @desc    Get environmental impact statistics
// @access  Private
router.get('/environmental-impact', auth, async (req, res) => {
  try {
    const { timeframe = 'all' } = req.query;
    
    let dateFilter = {};
    if (timeframe !== 'all') {
      const end = moment();
      let start;
      
      switch (timeframe) {
        case 'week':
          start = moment().subtract(1, 'week');
          break;
        case 'month':
          start = moment().subtract(1, 'month');
          break;
        case 'quarter':
          start = moment().subtract(3, 'months');
          break;
        case 'year':
          start = moment().subtract(1, 'year');
          break;
        default:
          start = moment().subtract(1, 'month');
      }
      
      dateFilter = {
        createdAt: {
          $gte: start.toDate(),
          $lte: end.toDate()
        }
      };
    }

    // Overall environmental impact
    const overallImpact = await EwasteItem.aggregate([
      { $match: dateFilter },
      {
        $group: {
          _id: null,
          totalCO2Saved: { $sum: { $ifNull: ['$environmentalImpact.co2Saved', 0] } },
          totalLandfillSaved: { $sum: { $ifNull: ['$environmentalImpact.landfillSpaceSaved', 0] } },
          totalToxicPrevented: { $sum: { $ifNull: ['$environmentalImpact.toxicMaterialsPrevented', 0] } },
          totalItems: { $sum: 1 },
          totalWeight: { $sum: { $ifNull: ['$estimatedWeight', 0] } }
        }
      }
    ]);

    // Impact by category
    const impactByCategory = await EwasteItem.aggregate([
      { $match: dateFilter },
      {
        $group: {
          _id: '$category',
          co2Saved: { $sum: { $ifNull: ['$environmentalImpact.co2Saved', 0] } },
          landfillSaved: { $sum: { $ifNull: ['$environmentalImpact.landfillSpaceSaved', 0] } },
          toxicPrevented: { $sum: { $ifNull: ['$environmentalImpact.toxicMaterialsPrevented', 0] } },
          itemCount: { $sum: 1 },
          totalWeight: { $sum: { $ifNull: ['$estimatedWeight', 0] } }
        }
      },
      { $sort: { co2Saved: -1 } }
    ]);

    // Impact by department
    const impactByDepartment = await EwasteItem.aggregate([
      { $match: dateFilter },
      {
        $group: {
          _id: '$department',
          co2Saved: { $sum: { $ifNull: ['$environmentalImpact.co2Saved', 0] } },
          landfillSaved: { $sum: { $ifNull: ['$environmentalImpact.landfillSpaceSaved', 0] } },
          toxicPrevented: { $sum: { $ifNull: ['$environmentalImpact.toxicMaterialsPrevented', 0] } },
          itemCount: { $sum: 1 },
          totalWeight: { $sum: { $ifNull: ['$estimatedWeight', 0] } }
        }
      },
      { $sort: { co2Saved: -1 } }
    ]);

    // Impact over time
    const impactOverTime = await EwasteItem.aggregate([
      { $match: dateFilter },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' }
          },
          co2Saved: { $sum: { $ifNull: ['$environmentalImpact.co2Saved', 0] } },
          landfillSaved: { $sum: { $ifNull: ['$environmentalImpact.landfillSpaceSaved', 0] } },
          toxicPrevented: { $sum: { $ifNull: ['$environmentalImpact.toxicMaterialsPrevented', 0] } },
          itemCount: { $sum: 1 }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } }
    ]);

    // Equivalent metrics (fun facts)
    const equivalentMetrics = {
      treesPlanted: Math.round((overallImpact[0]?.totalCO2Saved || 0) / 22), // 1 tree absorbs ~22kg CO2/year
      carsOffRoad: Math.round((overallImpact[0]?.totalCO2Saved || 0) / 4600), // 1 car emits ~4600kg CO2/year
      homesPowered: Math.round((overallImpact[0]?.totalCO2Saved || 0) / 8000), // 1 home emits ~8000kg CO2/year
      swimmingPools: Math.round((overallImpact[0]?.totalLandfillSaved || 0) / 0.5) // 1 pool = ~0.5 cubic meters
    };

    res.json({
      timeframe,
      overallImpact: overallImpact[0] || {
        totalCO2Saved: 0,
        totalLandfillSaved: 0,
        totalToxicPrevented: 0,
        totalItems: 0,
        totalWeight: 0
      },
      impactByCategory,
      impactByDepartment,
      impactOverTime,
      equivalentMetrics
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: 'Server error' });
  }
});

// @route   GET /api/analytics/performance
// @desc    Get performance metrics and KPIs
// @access  Private
router.get('/performance', auth, async (req, res) => {
  try {
    const { timeframe = 'month' } = req.query;
    
    const end = moment();
    let start;
    
    switch (timeframe) {
      case 'week':
        start = moment().subtract(1, 'week');
        break;
      case 'month':
        start = moment().subtract(1, 'month');
        break;
      case 'quarter':
        start = moment().subtract(3, 'months');
        break;
      case 'year':
        start = moment().subtract(1, 'year');
        break;
      default:
        start = moment().subtract(1, 'month');
    }

    const dateFilter = {
      createdAt: {
        $gte: start.toDate(),
        $lte: end.toDate()
      }
    };

    // Processing time metrics
    const processingTime = await EwasteItem.aggregate([
      { $match: { ...dateFilter, status: { $in: ['recycled', 'reused', 'disposed'] } } },
      {
        $project: {
          processingDays: {
            $ceil: {
              $divide: [
                { $subtract: ['$disposalDate', '$createdAt'] },
                1000 * 60 * 60 * 24
              ]
            }
          }
        }
      },
      {
        $group: {
          _id: null,
          avgProcessingTime: { $avg: '$processingDays' },
          minProcessingTime: { $min: '$processingDays' },
          maxProcessingTime: { $max: '$processingDays' }
        }
      }
    ]);

    // Status transition rates
    const statusTransitions = await EwasteItem.aggregate([
      { $match: dateFilter },
      {
        $project: {
          status: 1,
          hasVendor: { $cond: [{ $ne: ['$vendor', null] }, 1, 0] },
          hasPickupDate: { $cond: [{ $ne: ['$pickupDate', null] }, 1, 0] }
        }
      },
      {
        $group: {
          _id: null,
          totalItems: { $sum: 1 },
          itemsWithVendor: { $sum: '$hasVendor' },
          itemsWithPickup: { $sum: '$hasPickupDate' },
          recycledItems: { $sum: { $cond: [{ $eq: ['$status', 'recycled'] }, 1, 0] } },
          reusedItems: { $sum: { $cond: [{ $eq: ['$status', 'reused'] }, 1, 0] } },
          disposedItems: { $sum: { $cond: [{ $eq: ['$status', 'disposed'] }, 1, 0] } }
        }
      }
    ]);

    // User engagement metrics
    const userEngagement = await User.aggregate([
      { $match: { isActive: true } },
      {
        $project: {
          username: 1,
          role: 1,
          department: 1,
          building: 1,
          greenScore: 1,
          totalEwasteContributed: 1,
          lastLogin: 1,
          daysSinceLastLogin: {
            $ceil: {
              $divide: [
                { $subtract: [new Date(), '$lastLogin'] },
                1000 * 60 * 60 * 24
              ]
            }
          }
        }
      },
      { $sort: { greenScore: -1 } }
    ]);

    // Vendor performance
    const vendorPerformance = await Vendor.aggregate([
      { $match: { status: 'active' } },
      {
        $project: {
          name: 1,
          companyName: 1,
          rating: '$rating.average',
          totalReviews: '$rating.totalReviews',
          totalItemsProcessed: '$performance.totalItemsProcessed',
          totalWeightProcessed: '$performance.totalWeightProcessed',
          successRate: '$performance.successRate'
        }
      },
      { $sort: { rating: -1 } }
    ]);

    // Calculate KPIs
    const kpis = {
      recyclingRate: statusTransitions[0] ? 
        Math.round(((statusTransitions[0].recycledItems + statusTransitions[0].reusedItems) / statusTransitions[0].totalItems) * 100) : 0,
      vendorAssignmentRate: statusTransitions[0] ? 
        Math.round((statusTransitions[0].itemsWithVendor / statusTransitions[0].totalItems) * 100) : 0,
      pickupRate: statusTransitions[0] ? 
        Math.round((statusTransitions[0].itemsWithPickup / statusTransitions[0].totalItems) * 100) : 0,
      avgProcessingTime: processingTime[0]?.avgProcessingTime || 0,
      activeUsers: userEngagement.filter(u => u.daysSinceLastLogin <= 30).length,
      totalGreenScore: userEngagement.reduce((sum, u) => sum + u.greenScore, 0)
    };

    res.json({
      timeframe,
      dateRange: { start: start.toDate(), end: end.toDate() },
      processingTime: processingTime[0] || {},
      statusTransitions: statusTransitions[0] || {},
      userEngagement,
      vendorPerformance,
      kpis
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: 'Server error' });
  }
});

// @route   GET /api/analytics/export
// @desc    Export analytics data for reporting
// @access  Private (Manager/Admin)
router.get('/export', auth, async (req, res) => {
  try {
    // Check permissions
    if (!['admin', 'manager'].includes(req.user.role)) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const { format = 'json', startDate, endDate } = req.query;
    
    let dateFilter = {};
    if (startDate && endDate) {
      dateFilter = {
        createdAt: {
          $gte: new Date(startDate),
          $lte: new Date(endDate)
        }
      };
    }

    // Get comprehensive data
    const items = await EwasteItem.find(dateFilter)
      .populate('reportedBy', 'username email role department building')
      .populate('vendor', 'name companyName')
      .sort({ createdAt: -1 });

    const users = await User.find({ isActive: true })
      .select('-password')
      .sort({ greenScore: -1 });

    const vendors = await Vendor.find({ status: 'active' })
      .sort({ 'rating.average': -1 });

    const exportData = {
      exportDate: new Date(),
      dateRange: { startDate, endDate },
      summary: {
        totalItems: items.length,
        totalUsers: users.length,
        totalVendors: vendors.length
      },
      items,
      users,
      vendors
    };

    if (format === 'csv') {
      // Convert to CSV format (simplified)
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename=ewaste-analytics.csv');
      
      // Simple CSV conversion
      const csvData = items.map(item => {
        return `${item.qrCode},${item.name},${item.category},${item.status},${item.department},${item.reportedBy?.username || ''},${item.createdAt}`;
      }).join('\n');
      
      res.send(`QR Code,Name,Category,Status,Department,Reported By,Created At\n${csvData}`);
    } else {
      res.json(exportData);
    }
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;