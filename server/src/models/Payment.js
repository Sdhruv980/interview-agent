const mongoose = require('mongoose');

const PaymentSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    orderId: {
      type: String,
      required: true,
      unique: true,
    },
    paymentId: {
      type: String,
      default: '',
    },
    signature: {
      type: String,
      default: '',
    },
    amount: {
      type: Number,
      required: true, // In INR Rupees
    },
    currency: {
      type: String,
      default: 'INR',
    },
    credits: {
      type: Number,
      required: true,
    },
    status: {
      type: String,
      enum: ['created', 'captured', 'failed', 'refunded'],
      default: 'created',
    },
    method: {
      type: String,
      default: 'razorpay',
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Payment', PaymentSchema);
