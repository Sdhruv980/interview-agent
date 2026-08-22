import { Router, Response, NextFunction } from 'express';
import { protect, AuthRequest } from '../middleware/auth';
import User from '../models/User';

const router = Router();

router.use(protect);

/**
 * GET /api/users/credits
 * Get current user's credit balance
 */
router.get('/credits', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    res.status(200).json({ success: true, credits: req.user!.credits });
  } catch (err) {
    next(err);
  }
});

/**
 * PATCH /api/users/profile
 * Update name
 */
router.patch('/profile', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { name } = req.body as { name?: string };
    if (!name) {
      res.status(400).json({ success: false, message: 'Name is required' });
      return;
    }

    const user = await User.findByIdAndUpdate(
      req.user!._id,
      { name },
      { new: true, runValidators: true }
    );

    res.status(200).json({
      success: true,
      user: { id: user!._id, name: user!.name, email: user!.email, credits: user!.credits },
    });
  } catch (err) {
    next(err);
  }
});

export default router;
