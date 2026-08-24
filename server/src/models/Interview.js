const mongoose = require('mongoose');

const QuestionSchema = new mongoose.Schema({
  questionText: { type: String, required: true },
  userAnswer:   { type: String, default: '' },
  aiFeedback:   { type: String, default: '' },
  score:        { type: Number, default: 0, min: 0, max: 10 },
});

const InterviewSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    role: {
      type: String,
      required: [true, 'Job role is required'],
      trim: true,
    },
    techStack: {
      type: [String],
      default: [],
    },
    difficulty: {
      type: String,
      enum: ['easy', 'medium', 'hard'],
      default: 'medium',
    },
    status: {
      type: String,
      enum: ['pending', 'in_progress', 'completed'],
      default: 'pending',
    },
    questions: {
      type: [QuestionSchema],
      default: [],
    },
    overallScore: {
      type: Number,
      default: null,
    },
    overallFeedback: {
      type: String,
      default: null,
    },
    creditsUsed: {
      type: Number,
      default: 1,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Interview', InterviewSchema);
