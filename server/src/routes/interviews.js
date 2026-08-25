const express   = require('express');
const Interview = require('../models/Interview');
const { protect } = require('../middleware/auth');
const { generateQuestions, evaluateAnswer, generateRoundReport } = require('../services/aiService');

const router = express.Router();

// All routes require auth
router.use(protect);

// GET /api/interviews — list the current user's interviews
router.get('/', async (req, res, next) => {
  try {
    const interviews = await Interview.find({ userId: req.user._id })
      .sort({ createdAt: -1 })
      .select('-questions.aiFeedback');

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
    const { role, techStack, difficulty, roundType } = req.body;

    if (!role) {
      return res.status(400).json({ success: false, message: 'Job role is required' });
    }

    const user = req.user;
    if (user.credits < 1) {
      return res.status(402).json({ success: false, message: 'Insufficient credits' });
    }

    user.credits -= 1;
    await user.save();

    const interview = await Interview.create({
      userId:               user._id,
      role,
      techStack:            techStack || [],
      difficulty:           difficulty || 'medium',
      roundType:            roundType || 'technical',
      currentQuestionIndex: 0,
      creditsUsed:          1,
    });

    res.status(201).json({ success: true, data: interview });
  } catch (err) {
    next(err);
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/interviews/:id/generate
// ─────────────────────────────────────────────────────────────────────────────
router.post('/:id/generate', async (req, res, next) => {
  try {
    const interview = await Interview.findOne({ _id: req.params.id, userId: req.user._id });

    if (!interview) {
      return res.status(404).json({ success: false, message: 'Interview not found' });
    }

    if (interview.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: 'Questions have already been generated for this interview.',
      });
    }

    if (!process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY.length < 10) {
      return res.status(503).json({
        success: false,
        message: 'GEMINI_API_KEY is not configured on the server.',
      });
    }

    const questionTexts = await generateQuestions(
      interview.role,
      interview.techStack,
      interview.difficulty,
      interview.roundType
    );

    interview.questions = questionTexts.map((q) => ({
      questionText: q,
      userAnswer:   '',
      aiFeedback:   '',
      score:        0,
    }));
    interview.currentQuestionIndex = 0;
    interview.status = 'in_progress';
    await interview.save();

    res.status(200).json({ success: true, data: interview });
  } catch (err) {
    console.error('[/generate] Gemini error:', err.status, err.message, err.code);
    return res.status(503).json({
      success: false,
      message: geminiErrorMessage(err),
    });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// PATCH /api/interviews/:id/progress — save current question index / draft answer
// ─────────────────────────────────────────────────────────────────────────────
router.patch('/:id/progress', async (req, res, next) => {
  try {
    const { currentQuestionIndex, draftAnswer } = req.body;
    const interview = await Interview.findOne({ _id: req.params.id, userId: req.user._id });

    if (!interview) {
      return res.status(404).json({ success: false, message: 'Interview not found' });
    }

    if (currentQuestionIndex !== undefined) {
      const idx = Number(currentQuestionIndex);
      if (idx >= 0 && idx < interview.questions.length) {
        interview.currentQuestionIndex = idx;
      }
    }

    if (draftAnswer !== undefined && interview.currentQuestionIndex < interview.questions.length) {
      // If the question hasn't been submitted with feedback yet, save draft
      const currentQ = interview.questions[interview.currentQuestionIndex];
      if (currentQ && !currentQ.aiFeedback) {
        currentQ.userAnswer = draftAnswer;
        interview.markModified('questions');
      }
    }

    await interview.save();
    res.status(200).json({ success: true, data: interview });
  } catch (err) {
    next(err);
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/interviews/:id/answer
// ─────────────────────────────────────────────────────────────────────────────
router.post('/:id/answer', async (req, res, next) => {
  try {
    const { questionIndex, answer } = req.body;

    if (questionIndex === undefined || answer === undefined) {
      return res.status(400).json({ success: false, message: 'questionIndex and answer are required.' });
    }

    const interview = await Interview.findOne({ _id: req.params.id, userId: req.user._id });

    if (!interview) {
      return res.status(404).json({ success: false, message: 'Interview not found' });
    }

    if (interview.status !== 'in_progress') {
      return res.status(400).json({ success: false, message: 'This interview is not in progress.' });
    }

    const idx = Number(questionIndex);
    if (idx < 0 || idx >= interview.questions.length) {
      return res.status(400).json({ success: false, message: 'Invalid question index.' });
    }

    const q = interview.questions[idx];

    if (q.aiFeedback) {
      return res.status(400).json({ success: false, message: 'This question has already been answered.' });
    }

    const evaluation = await evaluateAnswer(
      interview.role,
      interview.techStack,
      interview.difficulty,
      q.questionText,
      answer,
      interview.roundType
    );

    interview.questions[idx].userAnswer   = answer;
    interview.questions[idx].aiFeedback   = evaluation.feedback;
    interview.questions[idx].score        = evaluation.score;
    interview.questions[idx].rubric       = evaluation.rubric;
    interview.questions[idx].strengths    = evaluation.strengths;
    interview.questions[idx].improvements = evaluation.improvements;
    interview.questions[idx].idealAnswer  = evaluation.idealAnswer;
    interview.markModified('questions');

    const allDone = interview.questions.every((q) => q.aiFeedback);

    if (allDone) {
      const total = interview.questions.reduce((sum, q) => sum + (q.score || 0), 0);
      interview.overallScore = Math.round((total / interview.questions.length) * 10) / 10;

      // Compute average rubric scores
      const avgRubric = { clarity: 0, correctness: 0, structure: 0, confidence: 0 };
      interview.questions.forEach((q) => {
        if (q.rubric) {
          avgRubric.clarity     += q.rubric.clarity || 0;
          avgRubric.correctness += q.rubric.correctness || 0;
          avgRubric.structure   += q.rubric.structure || 0;
          avgRubric.confidence  += q.rubric.confidence || 0;
        }
      });
      const qLen = interview.questions.length || 1;
      interview.overallRubric = {
        clarity:     Math.round((avgRubric.clarity / qLen) * 10) / 10,
        correctness: Math.round((avgRubric.correctness / qLen) * 10) / 10,
        structure:   Math.round((avgRubric.structure / qLen) * 10) / 10,
        confidence:  Math.round((avgRubric.confidence / qLen) * 10) / 10,
      };

      // Generate synthesized round feedback report
      const report = await generateRoundReport(
        interview.role,
        interview.techStack,
        interview.difficulty,
        interview.roundType,
        interview.questions
      );

      interview.summaryReport        = report.summary;
      interview.overallStrengths     = report.overallStrengths;
      interview.overallImprovements  = report.overallImprovements;

      const scoreLabel =
        interview.overallScore >= 8 ? 'Excellent' :
        interview.overallScore >= 6 ? 'Good' :
        interview.overallScore >= 4 ? 'Fair' : 'Needs improvement';

      interview.overallFeedback = `${scoreLabel} performance. ${report.summary}`;
      interview.status = 'completed';
    } else {
      // Advance to next question index in DB
      if (idx + 1 < interview.questions.length) {
        interview.currentQuestionIndex = idx + 1;
      }
    }

    await interview.save();

    res.status(200).json({
      success:         true,
      score:           evaluation.score,
      rubric:          evaluation.rubric,
      feedback:        evaluation.feedback,
      strengths:       evaluation.strengths,
      improvements:    evaluation.improvements,
      idealAnswer:     evaluation.idealAnswer,
      allDone,
      overallScore:    interview.overallScore,
      overallFeedback: interview.overallFeedback,
      data:            interview,
    });
  } catch (err) {
    console.error('[/answer] Gemini error:', err.status, err.message, err.code);
    return res.status(503).json({
      success: false,
      message: geminiErrorMessage(err),
    });
  }
});

// PATCH /api/interviews/:id
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

// ── Helper: turn Gemini SDK errors into readable user messages ───────────────
function geminiErrorMessage(err) {
  const status  = err.status || err.statusCode;
  const message = err.message || '';

  if (status === 401 || message.includes('API key not valid')) {
    return 'Invalid Gemini API key — check GEMINI_API_KEY in server/.env';
  }
  if (status === 429 || message.includes('quota')) {
    return 'Gemini API quota exceeded. Wait a moment and try again.';
  }
  if (status === 500 || status === 503) {
    return 'Gemini service is temporarily unavailable. Try again in a moment.';
  }

  return message || 'Gemini request failed.';
}

module.exports = router;
