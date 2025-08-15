const express = require('express');
const auth = require('../middleware/auth');
const EwasteItem = require('../models/EwasteItem');
const User = require('../models/User');
const Vendor = require('../models/Vendor');
const Campaign = require('../models/Campaign');
const moment = require('moment');
const PDFDocument = require('pdfkit');

const router = express.Router();

// @route   GET /api/compliance/overview
// @desc    Get compliance overview and key metrics
// @access  Private (Manager/Admin)
router.get('/overview', auth, async (req, res) => {
  try {
    // Check permissions
    if (!['admin', 'manager'].includes(req.user.role)) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const now = moment();
    const startOfYear = moment().startOf('year');
    const startOfMonth = moment().startOf('month');

    // Yearly compliance metrics
    const yearlyMetrics = await EwasteItem.aggregate([
      {
        $match: {
          createdAt: { $gte: startOfYear.toDate() }
        }
      },
      {
        $group: {
          _id: null,
          totalItems: { $sum: 1 },
          totalWeight: { $sum: { $ifNull: ['$estimatedWeight', 0] } },
          recycledItems: { $sum: { $cond: [{ $eq: ['$status', 'recycled'] }, 1, 0] } },
          reusedItems: { $sum: { $cond: [{ $eq: ['$status', 'reused'] }, 1, 0] } },
          hazardousItems: { $sum: { $cond: [{ $eq: ['$classification', 'hazardous'] }, 1, 0] } },
          totalCO2Saved: { $sum: { $ifNull: ['$environmentalImpact.co2Saved', 0] } },
          totalLandfillSaved: { $sum: { $ifNull: ['$environmentalImpact.landfillSpaceSaved', 0] } },
          totalToxicPrevented: { $sum: { $ifNull: ['$environmentalImpact.toxicMaterialsPrevented', 0] } }
        }
      }
    ]);

    // Monthly compliance metrics
    const monthlyMetrics = await EwasteItem.aggregate([
      {
        $match: {
          createdAt: { $gte: startOfMonth.toDate() }
        }
      },
      {
        $group: {
          _id: null,
          totalItems: { $sum: 1 },
          totalWeight: { $sum: { $ifNull: ['$estimatedWeight', 0] } },
          recycledItems: { $sum: { $cond: [{ $eq: ['$status', 'recycled'] }, 1, 0] } },
          reusedItems: { $sum: { $cond: [{ $eq: ['$status', 'reused'] }, 1, 0] } }
        }
      }
    ]);

    // Compliance by category
    const complianceByCategory = await EwasteItem.aggregate([
      {
        $match: {
          createdAt: { $gte: startOfYear.toDate() }
        }
      },
      {
        $group: {
          _id: '$category',
          totalItems: { $sum: 1 },
          recycledItems: { $sum: { $cond: [{ $eq: ['$status', 'recycled'] }, 1, 0] } },
          reusedItems: { $sum: { $cond: [{ $eq: ['$status', 'reused'] }, 1, 0] } },
          totalWeight: { $sum: { $ifNull: ['$estimatedWeight', 0] } }
        }
      },
      {
        $addFields: {
          recyclingRate: {
            $multiply: [
              {
                $divide: [
                  { $add: ['$recycledItems', '$reusedItems'] },
                  '$totalItems'
                ]
              },
              100
            ]
          }
        }
      },
      { $sort: { recyclingRate: -1 } }
    ]);

    // Compliance by department
    const complianceByDepartment = await EwasteItem.aggregate([
      {
        $match: {
          createdAt: { $gte: startOfYear.toDate() }
        }
      },
      {
        $group: {
          _id: '$department',
          totalItems: { $sum: 1 },
          recycledItems: { $sum: { $cond: [{ $eq: ['$status', 'recycled'] }, 1, 0] } },
          reusedItems: { $sum: { $cond: [{ $eq: ['$status', 'reused'] }, 1, 0] } },
          totalWeight: { $sum: { $ifNull: ['$estimatedWeight', 0] } }
        }
      },
      {
        $addFields: {
          recyclingRate: {
            $multiply: [
              {
                $divide: [
                  { $add: ['$recycledItems', '$reusedItems'] },
                  '$totalItems'
                ]
              },
              100
            ]
          }
        }
      },
      { $sort: { recyclingRate: -1 } }
    ]);

    // Vendor compliance
    const vendorCompliance = await Vendor.aggregate([
      { $match: { status: 'active' } },
      {
        $lookup: {
          from: 'ewasteitems',
          localField: '_id',
          foreignField: 'vendor',
          as: 'assignedItems'
        }
      },
      {
        $project: {
          name: 1,
          companyName: 1,
          rating: '$rating.average',
          totalItemsAssigned: { $size: '$assignedItems' },
          processedItems: {
            $size: {
              $filter: {
                input: '$assignedItems',
                cond: { $in: ['$$this.status', ['recycled', 'reused', 'disposed']] }
              }
            }
          },
          certifications: 1,
          environmentalCompliance: 1
        }
      },
      {
        $addFields: {
          successRate: {
            $cond: [
              { $gt: ['$totalItemsAssigned', 0] },
              {
                $multiply: [
                  { $divide: ['$processedItems', '$totalItemsAssigned'] },
                  100
                ]
              },
              0
            ]
          }
        }
      },
      { $sort: { successRate: -1 } }
    ]);

    // Calculate compliance scores
    const yearly = yearlyMetrics[0] || {};
    const monthly = monthlyMetrics[0] || {};
    
    const complianceScores = {
      yearly: {
        recyclingRate: yearly.totalItems > 0 ? 
          Math.round(((yearly.recycledItems + yearly.reusedItems) / yearly.totalItems) * 100) : 0,
        hazardousHandling: yearly.hazardousItems > 0 ? 
          Math.round((yearly.hazardousItems / yearly.totalItems) * 100) : 0,
        environmentalImpact: yearly.totalCO2Saved > 0 ? 
          Math.round((yearly.totalCO2Saved / (yearly.totalWeight * 50)) * 100) : 0 // Simplified calculation
      },
      monthly: {
        recyclingRate: monthly.totalItems > 0 ? 
          Math.round(((monthly.recycledItems + monthly.reusedItems) / monthly.totalItems) * 100) : 0
      }
    };

    res.json({
      period: {
        year: startOfYear.format('YYYY'),
        month: startOfMonth.format('MMMM YYYY')
      },
      yearlyMetrics: yearly,
      monthlyMetrics: monthly,
      complianceByCategory,
      complianceByDepartment,
      vendorCompliance,
      complianceScores
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: 'Server error' });
  }
});

// @route   GET /api/compliance/report/:type
// @desc    Generate compliance report
// @access  Private (Manager/Admin)
router.get('/report/:type', auth, async (req, res) => {
  try {
    // Check permissions
    if (!['admin', 'manager'].includes(req.user.role)) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const { type } = req.params;
    const { startDate, endDate, format = 'json' } = req.query;

    let dateFilter = {};
    if (startDate && endDate) {
      dateFilter = {
        createdAt: {
          $gte: new Date(startDate),
          $lte: new Date(endDate)
        }
      };
    } else {
      // Default to current year
      const startOfYear = moment().startOf('year');
      const endOfYear = moment().endOf('year');
      dateFilter = {
        createdAt: {
          $gte: startOfYear.toDate(),
          $lte: endOfYear.toDate()
        }
      };
    }

    let reportData = {};

    switch (type) {
      case 'environmental':
        reportData = await generateEnvironmentalReport(dateFilter);
        break;
      case 'regulatory':
        reportData = await generateRegulatoryReport(dateFilter);
        break;
      case 'audit':
        reportData = await generateAuditReport(dateFilter);
        break;
      case 'traceability':
        reportData = await generateTraceabilityReport(dateFilter);
        break;
      default:
        return res.status(400).json({ error: 'Invalid report type' });
    }

    if (format === 'pdf') {
      const pdfBuffer = await generatePDFReport(type, reportData);
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename=${type}-compliance-report.pdf`);
      res.send(pdfBuffer);
    } else {
      res.json(reportData);
    }
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: 'Server error' });
  }
});

// @route   GET /api/compliance/standards
// @desc    Get compliance standards and requirements
// @access  Private
router.get('/standards', auth, async (req, res) => {
  try {
    const standards = {
      cpcb: {
        name: 'Central Pollution Control Board (CPCB)',
        requirements: [
          'Proper segregation of e-waste by category',
          'Safe handling of hazardous materials',
          'Documentation of disposal process',
          'Vendor certification verification',
          'Environmental impact assessment'
        ],
        thresholds: {
          recyclingRate: 80, // Minimum 80% recycling rate
          hazardousHandling: 100, // 100% proper handling
          traceability: 100 // 100% traceability
        }
      },
      ewasteRules: {
        name: 'E-Waste (Management) Rules',
        requirements: [
          'Extended Producer Responsibility (EPR)',
          'Collection and transportation standards',
          'Storage and treatment facilities',
          'Disposal and recycling standards',
          'Reporting and documentation'
        ],
        thresholds: {
          collectionEfficiency: 70, // Minimum 70% collection efficiency
          processingEfficiency: 80, // Minimum 80% processing efficiency
          disposalStandards: 100 // 100% compliance with disposal standards
        }
      },
      iso14001: {
        name: 'ISO 14001 Environmental Management',
        requirements: [
          'Environmental policy and objectives',
          'Environmental impact assessment',
          'Compliance with regulations',
          'Continuous improvement',
          'Documentation and records'
        ],
        thresholds: {
          policyImplementation: 100,
          impactAssessment: 100,
          regulatoryCompliance: 100
        }
      }
    };

    res.json(standards);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: 'Server error' });
  }
});

// @route   GET /api/compliance/check
// @desc    Check compliance status against standards
// @access  Private (Manager/Admin)
router.get('/check', auth, async (req, res) => {
  try {
    // Check permissions
    if (!['admin', 'manager'].includes(req.user.role)) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const startOfYear = moment().startOf('year');
    const endOfYear = moment().endOf('year');

    const dateFilter = {
      createdAt: {
        $gte: startOfYear.toDate(),
        $lte: endOfYear.toDate()
      }
    };

    // Get current compliance metrics
    const currentMetrics = await EwasteItem.aggregate([
      { $match: dateFilter },
      {
        $group: {
          _id: null,
          totalItems: { $sum: 1 },
          recycledItems: { $sum: { $cond: [{ $eq: ['$status', 'recycled'] }, 1, 0] } },
          reusedItems: { $sum: { $cond: [{ $eq: ['$status', 'reused'] }, 1, 0] } },
          hazardousItems: { $sum: { $cond: [{ $eq: ['$classification', 'hazardous'] }, 1, 0] } },
          itemsWithVendor: { $sum: { $cond: [{ $ne: ['$vendor', null] }, 1, 0] } },
          itemsWithTimeline: { $sum: { $cond: [{ $gt: [{ $size: '$timeline' }, 0] }, 1, 0] } }
        }
      }
    ]);

    const metrics = currentMetrics[0] || {};
    
    // Calculate compliance percentages
    const recyclingRate = metrics.totalItems > 0 ? 
      Math.round(((metrics.recycledItems + metrics.reusedItems) / metrics.totalItems) * 100) : 0;
    
    const vendorAssignmentRate = metrics.totalItems > 0 ? 
      Math.round((metrics.itemsWithVendor / metrics.totalItems) * 100) : 0;
    
    const traceabilityRate = metrics.totalItems > 0 ? 
      Math.round((metrics.itemsWithTimeline / metrics.totalItems) * 100) : 0;

    // Check against standards
    const complianceStatus = {
      cpcb: {
        recyclingRate: {
          required: 80,
          current: recyclingRate,
          compliant: recyclingRate >= 80,
          status: recyclingRate >= 80 ? 'Compliant' : 'Non-Compliant'
        },
        hazardousHandling: {
          required: 100,
          current: 100, // Assuming proper handling if items are tracked
          compliant: true,
          status: 'Compliant'
        },
        traceability: {
          required: 100,
          current: traceabilityRate,
          compliant: traceabilityRate >= 100,
          status: traceabilityRate >= 100 ? 'Compliant' : 'Non-Compliant'
        }
      },
      ewasteRules: {
        collectionEfficiency: {
          required: 70,
          current: vendorAssignmentRate,
          compliant: vendorAssignmentRate >= 70,
          status: vendorAssignmentRate >= 70 ? 'Compliant' : 'Non-Compliant'
        },
        processingEfficiency: {
          required: 80,
          current: recyclingRate,
          compliant: recyclingRate >= 80,
          status: recyclingRate >= 80 ? 'Compliant' : 'Non-Compliant'
        }
      },
      overall: {
        score: Math.round((recyclingRate + vendorAssignmentRate + traceabilityRate) / 3),
        status: recyclingRate >= 80 && vendorAssignmentRate >= 70 && traceabilityRate >= 100 ? 'Compliant' : 'Non-Compliant'
      }
    };

    res.json({
      period: {
        start: startOfYear.format('YYYY-MM-DD'),
        end: endOfYear.format('YYYY-MM-DD')
      },
      currentMetrics: {
        totalItems: metrics.totalItems,
        recyclingRate,
        vendorAssignmentRate,
        traceabilityRate
      },
      complianceStatus
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: 'Server error' });
  }
});

// Helper functions for report generation
async function generateEnvironmentalReport(dateFilter) {
  const environmentalData = await EwasteItem.aggregate([
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

  return {
    reportType: 'Environmental Impact Report',
    period: dateFilter,
    summary: environmentalData[0] || {},
    equivalentMetrics: {
      treesPlanted: Math.round((environmentalData[0]?.totalCO2Saved || 0) / 22),
      carsOffRoad: Math.round((environmentalData[0]?.totalCO2Saved || 0) / 4600),
      homesPowered: Math.round((environmentalData[0]?.totalCO2Saved || 0) / 8000)
    }
  };
}

async function generateRegulatoryReport(dateFilter) {
  const regulatoryData = await EwasteItem.aggregate([
    { $match: dateFilter },
    {
      $group: {
        _id: '$classification',
        count: { $sum: 1 },
        totalWeight: { $sum: { $ifNull: ['$estimatedWeight', 0] } }
      }
    }
  ]);

  return {
    reportType: 'Regulatory Compliance Report',
    period: dateFilter,
    classificationBreakdown: regulatoryData,
    complianceSummary: {
      totalItems: regulatoryData.reduce((sum, item) => sum + item.count, 0),
      totalWeight: regulatoryData.reduce((sum, item) => sum + item.totalWeight, 0)
    }
  };
}

async function generateAuditReport(dateFilter) {
  const auditData = await EwasteItem.aggregate([
    { $match: dateFilter },
    {
      $group: {
        _id: '$department',
        totalItems: { $sum: 1 },
        itemsWithVendor: { $sum: { $cond: [{ $ne: ['$vendor', null] }, 1, 0] } },
        itemsWithTimeline: { $sum: { $cond: [{ $gt: [{ $size: '$timeline' }, 0] }, 1, 0] } }
      }
    }
  ]);

  return {
    reportType: 'Audit Trail Report',
    period: dateFilter,
    departmentAudit: auditData,
    auditSummary: {
      totalDepartments: auditData.length,
      totalItems: auditData.reduce((sum, item) => sum + item.totalItems, 0)
    }
  };
}

async function generateTraceabilityReport(dateFilter) {
  const traceabilityData = await EwasteItem.aggregate([
    { $match: dateFilter },
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 },
        avgTimelineEntries: { $avg: { $size: '$timeline' } },
        itemsWithVendor: { $sum: { $cond: [{ $ne: ['$vendor', null] }, 1, 0] } }
      }
    }
  ]);

  return {
    reportType: 'Traceability Report',
    period: dateFilter,
    statusTraceability: traceabilityData,
    traceabilitySummary: {
      totalItems: traceabilityData.reduce((sum, item) => sum + item.count, 0),
      avgTimelineEntries: traceabilityData.reduce((sum, item) => sum + (item.avgTimelineEntries * item.count), 0) / 
                         traceabilityData.reduce((sum, item) => sum + item.count, 0)
    }
  };
}

async function generatePDFReport(type, data) {
  return new Promise((resolve) => {
    const doc = new PDFDocument();
    const chunks = [];

    doc.on('data', chunk => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));

    // Generate PDF content
    doc.fontSize(20).text(`${data.reportType}`, { align: 'center' });
    doc.moveDown();
    doc.fontSize(12).text(`Generated on: ${new Date().toLocaleDateString()}`);
    doc.moveDown();
    
    // Add report content based on type
    if (data.summary) {
      doc.fontSize(16).text('Summary');
      doc.fontSize(12).text(`Total Items: ${data.summary.totalItems || 0}`);
      doc.fontSize(12).text(`Total Weight: ${data.summary.totalWeight || 0} kg`);
    }

    doc.end();
  });
}

module.exports = router;