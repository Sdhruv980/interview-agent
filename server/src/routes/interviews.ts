import { Router, Response, NextFunction } from 'express';
import Interview from '../models/Interview';
import { protect, AuthRequest } from '../middleware/auth';

const router = Router();

// All interview routes require authentication
router.use(protect);

/**
 * GET /api/interviews
 * List all interviews for the logged-in user
 */
router.get('/', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const interviews = await Interview.find({ userId: req.user!._id })
      .sort({ createdAt: -1 })
      .select('-questions.aiFeedback'); // omit heavy fields in list view

    res.status(200).json({ success: true, count: interviews.length, data: interviews });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/interviews/:id
 * Get a single interview (full detail)
 */
router.get('/:id', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const interview = await Interview.findOne({
      _id: req.params.id,
      userId: req.user!._id,
    });

    if (!interview) {
      res.status(404).json({ success: false, message: 'Interview not found' });
      return;
    }

    res.status(200).json({ success: true, data: interview });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/interviews
 * Create a new interview session (deducts 1 credit)
 */
router.post('/', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { role, techStack, difficulty } = req.body as {
      role?: string;
      techStack?: string[];
      difficulty?: 'easy' | 'medium' | 'hard';
    };

    if (!role) {
      res.status(400).json({ success: false, message: 'Job role is required' });
      return;
    }

    const user = req.user!;
    if (user.credits < 1) {
      res.status(402).json({ success: false, message: 'Insufficient credits' });
      return;
    }

    // Deduct credit
    user.credits -= 1;
    await user.save();

    const interview = await Interview.create({
      userId: user._id,
      role,
      techStack: techStack ?? [],
      difficulty: difficulty ?? 'medium',
      creditsUsed: 1,
    });

    res.status(201).json({ success: true, data: interview });
  } catch (err) {
    next(err);
  }
});

/**
 * DELETE /api/interviews/:id
 * Soft-delete by setting status (hard delete for now)
 */
router.delete('/:id', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const interview = await Interview.findOneAndDelete({
      _id: req.params.id,
      userId: req.user!._id,
    });

    if (!interview) {
      res.status(404).json({ success: false, message: 'Interview not found' });
      return;
    }

    res.status(200).json({ success: true, message: 'Interview deleted' });
  } catch (err) {
    next(err);
  }
});

export default router;
