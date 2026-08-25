const { GoogleGenAI } = require('@google/genai');

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

// Fast, reliable models with fallback (gemini-3.5-flash-lite takes ~1s, followed by gemini-3.6-flash)
const CANDIDATE_MODELS = ['gemini-3.5-flash-lite', 'gemini-3.6-flash', 'gemini-3-flash-preview', 'gemini-3.7-flash'];

/**
 * Robust Gemini model caller with per-model timeout and automatic fallback
 */
async function callGemini(prompt, customConfig = {}) {
  let lastError = null;

  for (const model of CANDIDATE_MODELS) {
    try {
      const config = {
        responseMimeType: 'application/json',
        maxOutputTokens: 400,
        ...customConfig,
      };

      // Wrap in 7-second timeout to prevent UI hanging if a model lags
      const generatePromise = ai.models.generateContent({ model, contents: prompt, config });
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error(`Model ${model} timeout after 7000ms`)), 7000)
      );

      const response = await Promise.race([generatePromise, timeoutPromise]);
      const raw = response.text?.trim() || '';
      if (raw) return raw;
    } catch (err) {
      console.warn(`[aiService] Model ${model} error/timeout: ${err.message}. Trying next fallback model...`);
      lastError = err;
    }
  }

  throw lastError || new Error('All Gemini models failed to respond.');
}

const QUESTION_COUNT = { easy: 5, medium: 7, hard: 10 };

const DIFFICULTY_GUIDE = {
  easy:   'basic questions for beginners (0-1 years)',
  medium: 'intermediate questions for mid-level candidates (1-3 years)',
  hard:   'advanced questions for senior candidates (3+ years)',
};

/**
 * generateQuestions
 * Returns an array of question strings tailored to role, stack, difficulty, and roundType.
 */
const generateQuestions = async (role, techStack, difficulty, roundType = 'technical') => {
  const count    = QUESTION_COUNT[difficulty] ?? 5;
  const techList = techStack?.length ? techStack.join(', ') : 'general software engineering';

  let roundInstructions = '';
  if (roundType === 'hr') {
    roundInstructions = `Generate ${count} HR & behavioral interview questions (STAR scenarios, teamwork, handling conflicts, deadlines, work ethic, and career motivation) for a "${role}". Do not ask syntax/coding questions.`;
  } else if (roundType === 'mixed') {
    roundInstructions = `Generate ${count} interview questions with a mix of behavioral (teamwork, communication) and technical questions (${techList}) for a "${role}".`;
  } else {
    roundInstructions = `Generate ${count} technical interview questions for a "${role}" specializing in ${techList}. Focus: ${DIFFICULTY_GUIDE[difficulty]}.`;
  }

  const prompt = `You are an interviewer conducting a job interview.
${roundInstructions}

Return ONLY a JSON array of strings containing exactly ${count} question strings:
["Question 1?", "Question 2?"]`;

  const raw = await callGemini(prompt, { maxOutputTokens: 600 });
  const jsonStr = raw.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '').trim();

  let questions;
  try {
    questions = JSON.parse(jsonStr);
  } catch {
    throw new Error('AI returned malformed JSON — could not parse questions.');
  }

  if (!Array.isArray(questions) || questions.length === 0) {
    throw new Error('AI returned an empty question list.');
  }

  return questions.map((q) => String(q).trim());
};

/**
 * evaluateAnswer
 * Returns full rubric breakdown: clarity, correctness, structure, confidence, strengths, improvements, idealAnswer
 */
const evaluateAnswer = async (role, techStack, difficulty, question, userAnswer, roundType = 'technical') => {
  const techList = Array.isArray(techStack) ? techStack.join(', ') : String(techStack);

  const criteria = roundType === 'hr'
    ? 'Assess clarity (communication tone), correctness (relevance to role), structure (STAR method), and confidence (conviction/ownership).'
    : 'Assess clarity (explanation quality), correctness (technical depth & accuracy), structure (logical flow), and confidence (technical conviction).';

  const prompt = `You are an expert AI interview evaluation engine.
Evaluate this candidate's answer using a 4-dimensional rubric (Clarity, Correctness, Structure, Confidence) scored from 0 to 10.

Role: ${role}
Round Type: ${roundType}
Tech Stack: ${techList}
Question: ${question}
Candidate's Answer: ${userAnswer || '(No answer provided)'}

Evaluation Criteria: ${criteria}

Respond ONLY with a JSON object in this exact schema:
{
  "score": <overall integer 0-10>,
  "rubric": {
    "clarity": <integer 0-10>,
    "correctness": <integer 0-10>,
    "structure": <integer 0-10>,
    "confidence": <integer 0-10>
  },
  "feedback": "<2-3 sentence concise evaluation of the answer>",
  "strengths": ["<strength 1>", "<optional strength 2>"],
  "improvements": ["<actionable improvement tip 1>", "<actionable improvement tip 2>"],
  "idealAnswer": "<2-3 sentence model answer showing how a top candidate would answer>"
}`;

  const raw = await callGemini(prompt, { maxOutputTokens: 450 });
  const jsonStr = raw.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '').trim();

  let parsed;
  try {
    parsed = JSON.parse(jsonStr);
  } catch {
    throw new Error('AI returned malformed feedback JSON.');
  }

  const clamp = (n, def = 0) => Math.min(10, Math.max(0, Math.round(Number(n) || def)));

  const rubric = {
    clarity:     clamp(parsed.rubric?.clarity, 5),
    correctness: clamp(parsed.rubric?.correctness, 5),
    structure:   clamp(parsed.rubric?.structure, 5),
    confidence:  clamp(parsed.rubric?.confidence, 5),
  };

  const calculatedScore = parsed.score !== undefined
    ? clamp(parsed.score)
    : Math.round((rubric.clarity + rubric.correctness + rubric.structure + rubric.confidence) / 4);

  return {
    score:        calculatedScore,
    rubric,
    feedback:     String(parsed.feedback || '').trim(),
    strengths:    Array.isArray(parsed.strengths) ? parsed.strengths.map(s => String(s).trim()) : [],
    improvements: Array.isArray(parsed.improvements) ? parsed.improvements.map(s => String(s).trim()) : [],
    idealAnswer:  String(parsed.idealAnswer || '').trim(),
  };
};

/**
 * generateRoundReport
 * Generates an executive summary, overall strengths, and recommendations for the completed interview.
 */
const generateRoundReport = async (role, techStack, difficulty, roundType, questions) => {
  const techList = Array.isArray(techStack) ? techStack.join(', ') : String(techStack);
  const qSummaries = questions.map((q, i) => `Q${i+1}: ${q.questionText} | Score: ${q.score}/10 | Answer: ${q.userAnswer.slice(0, 100)}...`).join('\n');

  const prompt = `You are a hiring manager synthesizing an interview report.
Role: ${role}
Round Type: ${roundType}
Tech Stack: ${techList}
Questions & Responses:
${qSummaries}

Generate an executive feedback report in JSON:
{
  "summary": "<3-4 sentence holistic summary of candidate readiness, strengths, and areas to develop>",
  "overallStrengths": ["<top key strength 1>", "<top key strength 2>"],
  "overallImprovements": ["<primary growth area 1>", "<primary growth area 2>"]
}`;

  try {
    const raw = await callGemini(prompt, { maxOutputTokens: 350 });
    const jsonStr = raw.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '').trim();
    const parsed = JSON.parse(jsonStr);
    return {
      summary:             String(parsed.summary || '').trim(),
      overallStrengths:    Array.isArray(parsed.overallStrengths) ? parsed.overallStrengths : [],
      overallImprovements: Array.isArray(parsed.overallImprovements) ? parsed.overallImprovements : [],
    };
  } catch (err) {
    console.warn('[aiService] generateRoundReport fallback:', err.message);
    return {
      summary:             `Comprehensive performance review across ${questions.length} questions in the ${roundType} round.`,
      overallStrengths:    ['Demonstrated baseline understanding of key concepts'],
      overallImprovements: ['Focus on structuring answers with specific metrics and real-world examples'],
    };
  }
};

module.exports = { generateQuestions, evaluateAnswer, generateRoundReport };
