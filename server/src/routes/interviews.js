const express   = require('express');
const Interview = require('../models/Interview');
const { protect } = require('../middleware/auth');

const router = express.Router();

// All routes require auth
router.use(protect);

// GET /api/interviews — list the current user's interviews
router.get('/', async (req, res, next) => {
  try {
    const interviews = await Interview.find({ userId: req.user._id })
      .sort({ createdAt: -1 })
      .select('-questions.aiFeedback'); // lighter list response

    res.status(200).json({ success: true, count: interviews.length, data: interviews });
  } catch (err) {
    next(err);
  }
});

// GET /api/interviews/:id — single interview (full)
router.get('/:id', async (req, res, next) => {
  try {
    const interview = await Interview.findOne({ _id: req.params.id, userId: req.user._id });

    if (!interview) {
      return res.status(404).json({ success: false, message: 'Interview not found' });
    }

    res.status(200).json({ success: true, data: interview });
  } catch (err) {
    next(err);
  }
});

// POST /api/interviews — create a new session (costs 1 credit)
router.post('/', async (req, res, next) => {
  try {
    const { role, techStack, difficulty } = req.body;

    if (!role) {
      return res.status(400).json({ success: false, message: 'Job role is required' });
    }

    const user = req.user;
    if (user.credits < 1) {
      return res.status(402).json({ success: false, message: 'Insufficient credits' });
    }

    // Deduct credit atomically
    user.credits -= 1;
    await user.save();

    const interview = await Interview.create({
      userId: user._id,
      role,
      techStack: techStack || [],
      difficulty: difficulty || 'medium',
      creditsUsed: 1,
    });

    res.status(201).json({ success: true, data: interview });
  } catch (err) {
    next(err);
  }
});

// PATCH /api/interviews/:id — update answers / status / feedback
router.patch('/:id', async (req, res, next) => {
  try {
    const allowed = ['status', 'questions', 'overallScore', 'overallFeedback'];
    const updates = {};
    allowed.forEach((key) => {
      if (req.body[key] !== undefined) updates[key] = req.body[key];
    });

    const interview = await Interview.findOneAndUpdate(
      { _id: req.params.id, userId: req.user._id },
      updates,
      { new: true, runValidators: true }
    );

    if (!interview) {
      return res.status(404).json({ success: false, message: 'Interview not found' });
    }

    res.status(200).json({ success: true, data: interview });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/interviews/:id
router.delete('/:id', async (req, res, next) => {
  try {
    const interview = await Interview.findOneAndDelete({ _id: req.params.id, userId: req.user._id });

    if (!interview) {
      return res.status(404).json({ success: false, message: 'Interview not found' });
    }

    res.status(200).json({ success: true, message: 'Interview deleted' });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
