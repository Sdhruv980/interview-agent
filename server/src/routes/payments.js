const express  = require('express');
const crypto   = require('crypto');
const Razorpay = require('razorpay');
const User     = require('../models/User');
const Payment  = require('../models/Payment');
const { protect } = require('../middleware/auth');

const router = express.Router();

function getRazorpay() {
  const key_id = process.env.RAZORPAY_KEY_ID;
  const key_secret = process.env.RAZORPAY_KEY_SECRET;

  if (!key_id || !key_secret) {
    throw new Error('Razorpay keys (RAZORPAY_KEY_ID or RAZORPAY_KEY_SECRET) are missing from .env');
  }

  return new Razorpay({ key_id, key_secret });
}

const PACKAGE_PRICES = {
  5:  50,
  10: 100,
  25: 225,
  50: 400,
};

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/payments/webhook (Public - Verified via Razorpay signature)
// ─────────────────────────────────────────────────────────────────────────────
router.post('/webhook', async (req, res) => {
  try {
    const signature = req.headers['x-razorpay-signature'];
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET || process.env.RAZORPAY_KEY_SECRET;

    if (!signature || !webhookSecret) {
      return res.status(400).json({ status: 'ignored', message: 'Missing signature or webhook secret' });
    }

    const payload = JSON.stringify(req.body);
    const expectedSignature = crypto
      .createHmac('sha256', webhookSecret)
      .update(payload)
      .digest('hex');

    if (signature !== expectedSignature) {
      console.warn('[Razorpay Webhook] Invalid webhook signature received');
      return res.status(400).json({ status: 'error', message: 'Invalid signature' });
    }

    const event = req.body.event;
    const paymentEntity = req.body.payload?.payment?.entity;
    const orderId = paymentEntity?.order_id;
    const paymentId = paymentEntity?.id;

    if (event === 'payment.captured' || event === 'order.paid') {
      if (orderId) {
        const paymentRecord = await Payment.findOne({ orderId });
        if (paymentRecord && paymentRecord.status !== 'captured') {
          paymentRecord.status = 'captured';
          paymentRecord.paymentId = paymentId || paymentRecord.paymentId;
          await paymentRecord.save();

          const user = await User.findById(paymentRecord.userId);
          if (user) {
            user.credits += Number(paymentRecord.credits);
            await user.save();
            console.log(`[Razorpay Webhook] Credited ${paymentRecord.credits} credits to user ${user._id}`);
          }
        }
      }
    }

    return res.status(200).json({ status: 'ok' });
  } catch (err) {
    console.error('[Razorpay Webhook Error]:', err);
    return res.status(500).json({ status: 'error', message: err.message });
  }
});

// ── Protect all downstream user payment routes ──────────────────────────────
router.use(protect);

/**
 * GET /api/payments/history
 * Returns the logged-in user's payment transaction history
 */
router.get('/history', async (req, res, next) => {
  try {
    const payments = await Payment.find({ userId: req.user._id })
      .sort({ createdAt: -1 })
      .limit(20);

    res.status(200).json({
      success: true,
      data: payments,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/payments/create-order
 * Creates a Razorpay order for buying credits.
 * Body: { credits: number }
 */
router.post('/create-order', async (req, res, next) => {
  try {
    const { credits } = req.body;

    if (!credits || credits < 1 || credits > 100) {
      return res.status(400).json({
        success: false,
        message: 'Credits must be between 1 and 100.',
      });
    }

    if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
      return res.status(503).json({
        success: false,
        message: 'Razorpay payment gateway is not configured on the server.',
      });
    }

    const priceInRupees = PACKAGE_PRICES[credits] || Math.round(credits * 10);
    const amountInPaise = priceInRupees * 100;

    const rzp = getRazorpay();
    const order = await rzp.orders.create({
      amount:   amountInPaise,
      currency: 'INR',
      receipt:  `rcpt_${req.user._id.toString().slice(-6)}_${Date.now().toString().slice(-6)}`,
      notes:    {
        userId:  String(req.user._id),
        credits: String(credits),
      },
    });

    // Record order in Payment collection
    await Payment.create({
      userId:   req.user._id,
      orderId:  order.id,
      amount:   priceInRupees,
      currency: 'INR',
      credits:  Number(credits),
      status:   'created',
    });

    res.status(200).json({
      success:  true,
      orderId:  order.id,
      amount:   order.amount,
      currency: order.currency,
      key:      process.env.RAZORPAY_KEY_ID,
    });
  } catch (err) {
    console.error('Razorpay create-order error:', err);
    res.status(500).json({
      success: false,
      message: err.error?.description || err.message || 'Failed to create Razorpay order.',
    });
  }
});

/**
 * POST /api/payments/verify
 * Verifies Razorpay payment signature and credits the user's account.
 * Body: { razorpay_order_id, razorpay_payment_id, razorpay_signature, credits }
 */
router.post('/verify', async (req, res, next) => {
  try {
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      credits,
    } = req.body;

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature || !credits) {
      return res.status(400).json({
        success: false,
        message: 'Missing payment verification fields.',
      });
    }

    // Verify signature
    const body = razorpay_order_id + '|' + razorpay_payment_id;
    const expectedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(body)
      .digest('hex');

    if (expectedSignature !== razorpay_signature) {
      return res.status(400).json({
        success: false,
        message: 'Payment verification failed — invalid signature.',
      });
    }

    // Find and update payment document
    const payment = await Payment.findOne({ orderId: razorpay_order_id });
    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    // Idempotency: only credit if not already captured
    if (!payment || payment.status !== 'captured') {
      user.credits += Number(credits);
      await user.save();

      if (payment) {
        payment.status = 'captured';
        payment.paymentId = razorpay_payment_id;
        payment.signature = razorpay_signature;
        await payment.save();
      }
    }

    res.status(200).json({
      success:    true,
      message:    `${credits} credits added successfully!`,
      newBalance: user.credits,
      paymentId:  razorpay_payment_id,
      orderId:    razorpay_order_id,
    });
  } catch (err) {
    console.error('Razorpay verify error:', err);
    next(err);
  }
});

module.exports = router;
