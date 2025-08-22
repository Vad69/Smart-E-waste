const express = require('express');
const { body, validationResult } = require('express-validator');
const auth = require('../middleware/auth');
const Campaign = require('../models/Campaign');
const User = require('../models/User');
const EwasteItem = require('../models/EwasteItem');

const router = express.Router();

// @route   POST /api/campaign
// @desc    Create a new campaign
// @access  Private (Admin/Manager)
router.post('/', auth, [
  body('title', 'Title is required').notEmpty(),
  body('description', 'Description is required').notEmpty(),
  body('type', 'Valid campaign type is required').isIn(['awareness', 'challenge', 'collection_drive', 'workshop', 'competition']),
  body('startDate', 'Start date is required').isISO8601(),
  body('endDate', 'End date is required').isISO8601(),
  body('targetAudience', 'Target audience is required').isArray({ min: 1 }),
  body('goals.targetItems').optional().isNumeric(),
  body('goals.targetWeight').optional().isNumeric(),
  body('goals.targetParticipants').optional().isNumeric()
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

    const { startDate, endDate } = req.body;
    
    // Validate date range
    if (new Date(startDate) >= new Date(endDate)) {
      return res.status(400).json({ error: 'End date must be after start date' });
    }

    // Add creator as organizer
    const campaignData = {
      ...req.body,
      organizers: [{
        user: req.user.id,
        role: 'coordinator'
      }]
    };

    const campaign = new Campaign(campaignData);
    await campaign.save();

    res.json(campaign);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: 'Server error' });
  }
});

// @route   GET /api/campaign
// @desc    Get all campaigns with filtering
// @access  Private
router.get('/', auth, async (req, res) => {
  try {
    const {
      status,
      type,
      targetAudience,
      page = 1,
      limit = 10,
      search
    } = req.query;

    // Build filter object
    const filter = {};
    if (status) filter.status = status;
    if (type) filter.type = type;
    if (targetAudience) filter.targetAudience = targetAudience;
    
    // Search functionality
    if (search) {
      filter.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { tags: { $in: [new RegExp(search, 'i')] } }
      ];
    }

    // Role-based filtering
    if (req.user.role === 'resident') {
      filter.$or = [
        { targetAudience: 'all' },
        { targetAudience: 'residents' },
        { buildings: req.user.building }
      ];
    } else if (req.user.role === 'staff' || req.user.role === 'student') {
      filter.$or = [
        { targetAudience: 'all' },
        { targetAudience: req.user.role },
        { departments: req.user.department }
      ];
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const campaigns = await Campaign.find(filter)
      .populate('organizers.user', 'username email role')
      .sort({ startDate: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Campaign.countDocuments(filter);

    res.json({
      campaigns,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / parseInt(limit)),
        totalCampaigns: total,
        campaignsPerPage: parseInt(limit)
      }
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: 'Server error' });
  }
});

// @route   GET /api/campaign/:id
// @desc    Get campaign by ID
// @access  Private
router.get('/:id', auth, async (req, res) => {
  try {
    const campaign = await Campaign.findById(req.params.id)
      .populate('organizers.user', 'username email role department building')
      .populate('leaderboard.user', 'username role department building greenScore');

    if (!campaign) {
      return res.status(404).json({ error: 'Campaign not found' });
    }

    // Check if user can participate
    const canParticipate = campaign.canUserParticipate(req.user);

    res.json({
      ...campaign.toObject(),
      canParticipate
    });
  } catch (err) {
    console.error(err.message);
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ error: 'Campaign not found' });
    }
    res.status(500).json({ error: 'Server error' });
  }
});

// @route   PUT /api/campaign/:id
// @desc    Update campaign
// @access  Private (Admin/Manager)
router.put('/:id', auth, [
  body('status').optional().isIn(['draft', 'active', 'paused', 'completed', 'cancelled']),
  body('startDate').optional().isISO8601(),
  body('endDate').optional().isISO8601()
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

    const campaign = await Campaign.findById(req.params.id);
    if (!campaign) {
      return res.status(404).json({ error: 'Campaign not found' });
    }

    // Check if user is organizer
    const isOrganizer = campaign.organizers.some(org => 
      org.user.toString() === req.user.id
    );
    
    if (!isOrganizer && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied' });
    }

    const updatedCampaign = await Campaign.findByIdAndUpdate(
      req.params.id,
      { $set: req.body },
      { new: true, runValidators: true }
    );

    res.json(updatedCampaign);
  } catch (err) {
    console.error(err.message);
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ error: 'Campaign not found' });
    }
    res.status(500).json({ error: 'Server error' });
  }
});

// @route   DELETE /api/campaign/:id
// @desc    Delete campaign (Admin only)
// @access  Private (Admin)
router.delete('/:id', auth, async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied' });
    }

    const campaign = await Campaign.findById(req.params.id);
    if (!campaign) {
      return res.status(404).json({ error: 'Campaign not found' });
    }

    await Campaign.findByIdAndDelete(req.params.id);

    res.json({ message: 'Campaign deleted successfully' });
  } catch (err) {
    console.error(err.message);
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ error: 'Campaign not found' });
    }
    res.status(500).json({ error: 'Server error' });
  }
});

// @route   POST /api/campaign/:id/join
// @desc    Join a campaign
// @access  Private
router.post('/:id/join', auth, async (req, res) => {
  try {
    const campaign = await Campaign.findById(req.params.id);
    if (!campaign) {
      return res.status(404).json({ error: 'Campaign not found' });
    }

    if (!campaign.isActive()) {
      return res.status(400).json({ error: 'Campaign is not active' });
    }

    if (!campaign.canUserParticipate(req.user)) {
      return res.status(400).json({ error: 'You cannot participate in this campaign' });
    }

    // Add user to participants
    await campaign.addParticipant(req.user.id);

    // Add user to leaderboard if not already there
    const existingEntry = campaign.leaderboard.find(entry => 
      entry.user.toString() === req.user.id
    );
    
    if (!existingEntry) {
      campaign.leaderboard.push({
        user: req.user.id,
        points: 0,
        itemsContributed: 0,
        weightContributed: 0,
        rank: campaign.leaderboard.length + 1
      });
    }

    await campaign.save();

    res.json({ message: 'Successfully joined campaign', campaign });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: 'Server error' });
  }
});

// @route   POST /api/campaign/:id/contribute
// @desc    Contribute e-waste items to campaign
// @access  Private
router.post('/:id/contribute', auth, [
  body('itemIds', 'Item IDs are required').isArray({ min: 1 }),
  body('notes').optional().notEmpty()
], async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { itemIds, notes } = req.body;

    const campaign = await Campaign.findById(req.params.id);
    if (!campaign) {
      return res.status(404).json({ error: 'Campaign not found' });
    }

    if (!campaign.isActive()) {
      return res.status(400).json({ error: 'Campaign is not active' });
    }

    // Check if user is participant
    const isParticipant = campaign.currentProgress.participants.includes(req.user.id);
    if (!isParticipant) {
      return res.status(400).json({ error: 'You must join the campaign first' });
    }

    // Get items and verify ownership
    const items = await EwasteItem.find({
      _id: { $in: itemIds },
      reportedBy: req.user.id
    });

    if (items.length !== itemIds.length) {
      return res.status(400).json({ error: 'Some items not found or not owned by you' });
    }

    // Calculate contribution metrics
    const totalWeight = items.reduce((sum, item) => sum + (item.estimatedWeight || 0), 0);
    const points = items.length * 10 + Math.floor(totalWeight * 5); // Simple scoring system

    // Update campaign progress
    await campaign.updateProgress(items.length, totalWeight);

    // Update leaderboard
    const leaderboardEntry = campaign.leaderboard.find(entry => 
      entry.user.toString() === req.user.id
    );
    
    if (leaderboardEntry) {
      leaderboardEntry.points += points;
      leaderboardEntry.itemsContributed += items.length;
      leaderboardEntry.weightContributed += totalWeight;
    }

    // Recalculate leaderboard ranks
    await campaign.calculateLeaderboard();

    // Update user's green score
    const user = await User.findById(req.user.id);
    user.totalEwasteContributed += items.length;
    user.updateGreenScore();
    await user.save();

    res.json({
      message: 'Contribution recorded successfully',
      contribution: {
        items: items.length,
        weight: totalWeight,
        points: points
      },
      campaign: campaign
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: 'Server error' });
  }
});

// @route   POST /api/campaign/:id/challenge/:challengeId/complete
// @desc    Complete a campaign challenge
// @access  Private
router.post('/:id/challenge/:challengeId/complete', auth, [
  body('proof', 'Proof of completion is required').notEmpty()
], async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { proof } = req.body;

    const campaign = await Campaign.findById(req.params.id);
    if (!campaign) {
      return res.status(404).json({ error: 'Campaign not found' });
    }

    const challenge = campaign.challenges.id(req.params.challengeId);
    if (!challenge) {
      return res.status(404).json({ error: 'Challenge not found' });
    }

    if (!campaign.isActive()) {
      return res.status(400).json({ error: 'Campaign is not active' });
    }

    // Check if user already completed this challenge
    const alreadyCompleted = challenge.participants.some(p => 
      p.user.toString() === req.user.id
    );
    
    if (alreadyCompleted) {
      return res.status(400).json({ error: 'Challenge already completed' });
    }

    // Add user to challenge participants
    challenge.participants.push({
      user: req.user.id,
      completedAt: new Date(),
      points: challenge.points
    });

    // Update leaderboard
    const leaderboardEntry = campaign.leaderboard.find(entry => 
      entry.user.toString() === req.user.id
    );
    
    if (leaderboardEntry) {
      leaderboardEntry.points += challenge.points;
    } else {
      // Add user to leaderboard if not there
      campaign.leaderboard.push({
        user: req.user.id,
        points: challenge.points,
        itemsContributed: 0,
        weightContributed: 0,
        rank: campaign.leaderboard.length + 1
      });
    }

    // Recalculate leaderboard ranks
    await campaign.calculateLeaderboard();

    await campaign.save();

    res.json({
      message: 'Challenge completed successfully',
      pointsEarned: challenge.points,
      campaign: campaign
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: 'Server error' });
  }
});

// @route   GET /api/campaign/:id/leaderboard
// @desc    Get campaign leaderboard
// @access  Private
router.get('/:id/leaderboard', auth, async (req, res) => {
  try {
    const campaign = await Campaign.findById(req.params.id)
      .populate('leaderboard.user', 'username role department building greenScore')
      .select('leaderboard title');

    if (!campaign) {
      return res.status(404).json({ error: 'Campaign not found' });
    }

    res.json({
      campaignTitle: campaign.title,
      leaderboard: campaign.leaderboard
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: 'Server error' });
  }
});

// @route   POST /api/campaign/:id/feedback
// @desc    Add feedback to campaign
// @access  Private
router.post('/:id/feedback', auth, [
  body('rating', 'Rating must be between 1 and 5').isInt({ min: 1, max: 5 }),
  body('comment', 'Comment is required').notEmpty()
], async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { rating, comment } = req.body;

    const campaign = await Campaign.findById(req.params.id);
    if (!campaign) {
      return res.status(404).json({ error: 'Campaign not found' });
    }

    // Check if user already provided feedback
    const existingFeedback = campaign.feedback.find(f => 
      f.user.toString() === req.user.id
    );
    
    if (existingFeedback) {
      return res.status(400).json({ error: 'You have already provided feedback for this campaign' });
    }

    campaign.feedback.push({
      user: req.user.id,
      rating,
      comment,
      date: new Date()
    });

    await campaign.save();

    res.json({ message: 'Feedback added successfully', campaign });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;