const express = require('express');
const User    = require('../models/User');
const { protect } = require('../middleware/auth');

const router = express.Router();

router.use(protect);

// GET /api/users/credits
router.get('/credits', (req, res) => {
  res.status(200).json({ success: true, credits: req.user.credits });
});

// PATCH /api/users/profile — update name
router.patch('/profile', async (req, res, next) => {
  try {
    const { name } = req.body;
    if (!name) {
      return res.status(400).json({ success: false, message: 'Name is required' });
    }

    const user = await User.findByIdAndUpdate(
      req.user._id,
      { name },
      { new: true, runValidators: true }
    );

    res.status(200).json({
      success: true,
      user: { id: user._id, name: user.name, email: user.email, credits: user.credits },
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
