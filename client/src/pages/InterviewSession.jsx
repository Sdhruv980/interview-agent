import { useEffect, useState, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import Navbar from '../components/Navbar';
import { useAuth } from '../context/AuthContext';
import api from '../lib/api';

const scoreColor = (s) =>
  s >= 8 ? 'text-emerald-400' : s >= 5 ? 'text-amber-400' : 'text-rose-400';

const scoreBg = (s) =>
  s >= 8
    ? 'bg-emerald-950/40 border-emerald-800/60'
    : s >= 5
    ? 'bg-amber-950/40 border-amber-800/60'
    : 'bg-rose-950/40 border-rose-800/60';

const difficultyColor = {
  easy: 'bg-emerald-900/40 text-emerald-300 border-emerald-800/40',
  medium: 'bg-amber-900/40 text-amber-300 border-amber-800/40',
  hard: 'bg-rose-900/40 text-rose-300 border-rose-800/40',
};

const roundLabels = {
  technical: '💻 Technical Round',
  hr: '🤝 HR & Behavioral Round',
  mixed: '🎯 Mixed Round',
};

const QUESTION_TIMER_SECONDS = 60;

export default function InterviewSession() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { setUser } = useAuth();
  const answerRef = useRef(null);
  const videoRef = useRef(null);
  const recognitionRef = useRef(null);

  // Interview data
  const [interview, setInterview] = useState(null);
  const [loadError, setLoadError] = useState('');
  const [loading, setLoading] = useState(true);

  // Question flow & session state
  const [currentIdx, setCurrentIdx] = useState(0);
  const [answer, setAnswer] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');

  // Generation
  const [generating, setGenerating] = useState(false);
  const [genError, setGenError] = useState('');

  // AI & Voice Status: 'AI Speaking' | 'Listening' | 'Ready' | 'Evaluating'
  const [aiStatus, setAiStatus] = useState('Ready');
  const [isRecording, setIsRecording] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(true);

  // Timer
  const [timeLeft, setTimeLeft] = useState(QUESTION_TIMER_SECONDS);

  // Webcam
  const [cameraEnabled, setCameraEnabled] = useState(true);
  const [cameraError, setCameraError] = useState('');

  // Per-question feedback state
  const [latestFeedback, setLatestFeedback] = useState(null);
  const [showIdealAnswer, setShowIdealAnswer] = useState(false);

  // ── 1. Load interview on mount & restore session index ──────────────────────
  useEffect(() => {
    api
      .get(`/interviews/${id}`)
      .then((res) => {
        const data = res.data.data;
        setInterview(data);

        // Resume at persisted currentQuestionIndex if valid, else first unanswered
        if (data.questions?.length) {
          const firstUnanswered = data.questions.findIndex((q) => !q.aiFeedback);
          let targetIndex = 0;
          if (data.currentQuestionIndex !== undefined && data.currentQuestionIndex < data.questions.length) {
            targetIndex = data.currentQuestionIndex;
          } else if (firstUnanswered !== -1) {
            targetIndex = firstUnanswered;
          } else {
            targetIndex = data.questions.length - 1;
          }
          setCurrentIdx(targetIndex);
          setAnswer(data.questions[targetIndex]?.userAnswer || '');
        }
      })
      .catch((err) => setLoadError(err.message))
      .finally(() => setLoading(false));
  }, [id]);

  // ── 2. Setup Webcam Stream ──────────────────────────────────────────────────
  useEffect(() => {
    let stream = null;
    if (cameraEnabled && interview?.status === 'in_progress') {
      navigator.mediaDevices
        ?.getUserMedia({ video: true, audio: false })
        .then((s) => {
          stream = s;
          if (videoRef.current) {
            videoRef.current.srcObject = s;
          }
          setCameraError('');
        })
        .catch((err) => {
          console.warn('Webcam permission error:', err);
          setCameraError('Camera disabled or permission denied');
        });
    }

    return () => {
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [cameraEnabled, interview?.status]);

  // ── 3. Question timer effect ────────────────────────────────────────────────
  useEffect(() => {
    if (interview?.status !== 'in_progress') return;

    setTimeLeft(QUESTION_TIMER_SECONDS);

    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [currentIdx, interview?.status]);

  // ── 4. Web Speech Recognition Setup (Speech-to-Text) ────────────────────────
  useEffect(() => {
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setSpeechSupported(false);
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    recognition.onresult = (event) => {
      let final = '';

      for (let i = event.resultIndex; i < event.results.length; ++i) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          final += transcript + ' ';
        }
      }

      if (final) {
        setAnswer((prev) => {
          const base = prev.trim() ? prev.trim() + ' ' : '';
          return base + final;
        });
      }
    };

    recognition.onerror = (event) => {
      console.warn('Speech recognition error:', event.error);
      setIsRecording(false);
      setAiStatus('Ready');
    };

    recognition.onend = () => {
      setIsRecording(false);
      if (aiStatus === 'Listening') setAiStatus('Ready');
    };

    recognitionRef.current = recognition;

    return () => {
      try {
        recognition.stop();
      } catch {}
    };
  }, []);

  // ── 5. AI Speech Synthesis (Text-to-Speech) ─────────────────────────────────
  const speakQuestion = (text) => {
    if (!('speechSynthesis' in window)) return;

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1.0;
    utterance.pitch = 1.0;
    utterance.lang = 'en-US';

    setAiStatus('AI Speaking');

    utterance.onend = () => {
      setAiStatus('Ready');
    };

    utterance.onerror = () => {
      setAiStatus('Ready');
    };

    window.speechSynthesis.speak(utterance);
  };

  // Speak question automatically whenever current question index changes
  useEffect(() => {
    const questions = interview?.questions;
    if (questions && questions[currentIdx] && !questions[currentIdx].aiFeedback) {
      setAnswer(questions[currentIdx].userAnswer || '');
      speakQuestion(questions[currentIdx].questionText);
    }
    if (answerRef.current) answerRef.current.focus();
  }, [currentIdx, interview?._id]);

  // ── 6. Toggle Microphone for Speech-to-Text ─────────────────────────────────
  const toggleRecording = () => {
    if (!recognitionRef.current) {
      alert('Speech recognition is not supported in this browser. You can type your answer directly.');
      return;
    }

    if (isRecording) {
      recognitionRef.current.stop();
      setIsRecording(false);
      setAiStatus('Ready');
    } else {
      window.speechSynthesis?.cancel();
      try {
        recognitionRef.current.start();
        setIsRecording(true);
        setAiStatus('Listening');
      } catch (err) {
        console.error('Failed to start speech recognition:', err);
      }
    }
  };

  // ── 7. Generate questions ───────────────────────────────────────────────────
  const handleGenerate = async () => {
    setGenError('');
    setGenerating(true);
    try {
      const res = await api.post(`/interviews/${id}/generate`);
      setInterview(res.data.data);
      setCurrentIdx(0);
      setAnswer('');
      setLatestFeedback(null);
    } catch (err) {
      setGenError(err.message);
    } finally {
      setGenerating(false);
    }
  };

  // ── 8. Submit answer for current question ───────────────────────────────────
  const handleSubmitAnswer = async () => {
    if (!answer.trim()) return;

    if (isRecording && recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {}
      setIsRecording(false);
    }
    window.speechSynthesis?.cancel();

    setSubmitError('');
    setSubmitting(true);
    setAiStatus('Evaluating');
    setLatestFeedback(null);
    setShowIdealAnswer(false);

    try {
      const res = await api.post(`/interviews/${id}/answer`, {
        questionIndex: currentIdx,
        answer: answer.trim(),
      });

      const { score, rubric, feedback, strengths, improvements, idealAnswer, allDone, data: updated } = res.data;

      setInterview(updated);
      setLatestFeedback({ score, rubric, feedback, strengths, improvements, idealAnswer });
      setAiStatus('Ready');

      if (allDone) {
        api.get('/auth/me').then((r) => setUser(r.data.user)).catch(() => {});
      }
    } catch (err) {
      setSubmitError(err.message);
      setAiStatus('Ready');
    } finally {
      setSubmitting(false);
    }
  };

  // ── 9. Advance to next question ─────────────────────────────────────────────
  const handleNext = async () => {
    window.speechSynthesis?.cancel();
    setAnswer('');
    setLatestFeedback(null);
    setShowIdealAnswer(false);
    setSubmitError('');
    const nextIdx = currentIdx + 1;
    setCurrentIdx(nextIdx);

    try {
      await api.patch(`/interviews/${id}/progress`, {
        currentQuestionIndex: nextIdx,
      });
    } catch (err) {
      console.warn('Progress sync warning:', err);
    }
  };

  // ── Loading & error states ──────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 text-white flex items-center justify-center">
        <div className="text-center space-y-3">
          <Spinner />
          <p className="text-slate-400 animate-pulse text-lg">Loading interview session…</p>
        </div>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="min-h-screen bg-slate-900 text-white flex flex-col items-center justify-center gap-4">
        <p className="text-rose-400 bg-rose-950/50 border border-rose-800 px-6 py-4 rounded-xl">
          {loadError}
        </p>
        <Link to="/dashboard" className="text-emerald-400 hover:underline text-sm font-medium">
          ← Back to Dashboard
        </Link>
      </div>
    );
  }

  const questions = interview.questions || [];
  const isCompleted = interview.status === 'completed';
  const isPending = interview.status === 'pending';
  const currentQ = questions[currentIdx];
  const answeredCount = questions.filter((q) => q.aiFeedback).length;
  const isLastQuestion = currentIdx === questions.length - 1;
  const currentAnswered = currentQ?.aiFeedback;

  // ── 10. COMPREHENSIVE INTELLIGENT FEEDBACK REPORT (status = completed) ──────
  if (isCompleted) {
    const overallRubric = interview.overallRubric || { clarity: 0, correctness: 0, structure: 0, confidence: 0 };
    const performanceBadge =
      interview.overallScore >= 8.5 ? { label: '🌟 Senior / Exceptional Readiness', color: 'text-emerald-400 bg-emerald-950/60 border-emerald-700/60' } :
      interview.overallScore >= 7.0 ? { label: '✨ Strong Candidate / Proficient', color: 'text-emerald-400 bg-emerald-950/60 border-emerald-700/60' } :
      interview.overallScore >= 5.0 ? { label: '📈 Solid Foundation / Needs Refinement', color: 'text-amber-400 bg-amber-950/60 border-amber-700/60' } :
      { label: '🎯 Foundational / Needs Practice', color: 'text-rose-400 bg-rose-950/60 border-rose-700/60' };

    return (
      <div className="min-h-screen bg-slate-950 text-white pb-20">
        <Navbar />
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="max-w-5xl mx-auto px-4 py-10 space-y-8"
        >
          {/* Navigation & Header */}
          <div className="flex items-center justify-between">
            <Link to="/dashboard" className="text-slate-400 hover:text-emerald-400 text-sm font-semibold transition-colors flex items-center gap-1.5">
              ← Back to My Interviews
            </Link>
            <div className="flex items-center gap-2">
              <span className="text-xs uppercase tracking-wider px-3.5 py-1 bg-slate-900 text-emerald-300 rounded-full border border-emerald-900/60 font-medium">
                {roundLabels[interview.roundType] || 'Technical Round'}
              </span>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => window.print()}
                className="text-xs px-3.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-full border border-slate-700 font-medium transition-colors"
              >
                🖨️ Print / Save PDF
              </motion.button>
            </div>
          </div>

          {/* Executive Performance Summary Card */}
          <div className="bg-slate-900 rounded-3xl p-8 border border-slate-800 shadow-2xl relative overflow-hidden space-y-6">
            <div className="absolute top-0 right-0 w-80 h-80 bg-emerald-600/10 rounded-full blur-3xl pointer-events-none" />

            <div className="flex flex-col md:flex-row items-center justify-between gap-6 border-b border-slate-800/80 pb-6">
              <div className="text-center md:text-left space-y-2">
                <span className={`inline-block text-xs font-semibold px-3 py-1 rounded-full border ${performanceBadge.color}`}>
                  {performanceBadge.label}
                </span>
                <h1 className="text-3xl font-extrabold text-white capitalize">
                  {interview.role} Evaluation Report
                </h1>
                <p className="text-xs text-slate-400">
                  Completed on {new Date(interview.updatedAt || interview.createdAt).toLocaleDateString(undefined, { dateStyle: 'full' })}
                </p>
              </div>

              <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-4 text-center min-w-[140px] shadow-inner">
                <p className="text-xs text-slate-400 uppercase font-semibold tracking-wider">Overall Score</p>
                <div className="text-5xl font-black mt-1">
                  <span className={scoreColor(interview.overallScore)}>{interview.overallScore}</span>
                  <span className="text-slate-500 text-2xl font-normal"> /10</span>
                </div>
              </div>
            </div>

            {/* 4-Metric Rubric Breakdown Dashboard */}
            <div className="space-y-3">
              <h3 className="text-xs uppercase font-bold tracking-wider text-slate-400">
                Core Competency Rubric Breakdown
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <RubricCard title="Clarity" score={overallRubric.clarity} desc="Articulation & conciseness" />
                <RubricCard title="Correctness" score={overallRubric.correctness} desc="Accuracy & conceptual depth" />
                <RubricCard title="Structure" score={overallRubric.structure} desc="Logical flow & framework" />
                <RubricCard title="Confidence" score={overallRubric.confidence} desc="Conviction & ownership" />
              </div>
            </div>

            {/* Executive Synthesis Summary */}
            <div className="bg-slate-950/70 rounded-2xl p-5 border border-slate-800/80 space-y-2">
              <h3 className="text-xs uppercase font-bold tracking-wider text-emerald-400">Executive Feedback Summary</h3>
              <p className="text-sm text-slate-200 leading-relaxed">
                {interview.summaryReport || interview.overallFeedback}
              </p>
            </div>

            {/* Round Strengths & Growth Areas */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {interview.overallStrengths?.length > 0 && (
                <div className="bg-emerald-950/20 border border-emerald-900/40 rounded-2xl p-4 space-y-2">
                  <h4 className="text-xs uppercase font-bold tracking-wider text-emerald-400 flex items-center gap-1.5">
                    <span>✅</span> Key Strengths Demonstrated
                  </h4>
                  <ul className="space-y-1.5 text-xs text-slate-300">
                    {interview.overallStrengths.map((s, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <span className="text-emerald-400 mt-0.5">•</span>
                        <span>{s}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {interview.overallImprovements?.length > 0 && (
                <div className="bg-amber-950/20 border border-amber-900/40 rounded-2xl p-4 space-y-2">
                  <h4 className="text-xs uppercase font-bold tracking-wider text-amber-400 flex items-center gap-1.5">
                    <span>💡</span> High-Impact Areas for Growth
                  </h4>
                  <ul className="space-y-1.5 text-xs text-slate-300">
                    {interview.overallImprovements.map((imp, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <span className="text-amber-400 mt-0.5">•</span>
                        <span>{imp}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>

          {/* Question-by-Question Detailed Feedback Analysis */}
          <div className="space-y-5">
            <h2 className="text-2xl font-bold text-slate-100 flex items-center gap-2">
              <span>📋</span> Detailed Question Analysis ({questions.length})
            </h2>

            <div className="space-y-5">
              {questions.map((q, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 10 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.3, delay: i * 0.05 }}
                  className={`rounded-3xl border p-6 space-y-5 ${scoreBg(q.score)} shadow-xl`}
                >
                  {/* Question Header & Score */}
                  <div className="flex items-start justify-between gap-4 border-b border-slate-800/60 pb-4">
                    <div className="space-y-1">
                      <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider">
                        Question {i + 1} of {questions.length}
                      </span>
                      <h3 className="text-base font-bold text-slate-100 leading-snug">
                        {q.questionText}
                      </h3>
                    </div>
                    <div className="text-right shrink-0">
                      <span className={`text-2xl font-black px-3.5 py-1 bg-slate-900/80 rounded-2xl border border-slate-700/60 ${scoreColor(q.score)}`}>
                        {q.score}/10
                      </span>
                    </div>
                  </div>

                  {/* 4 Rubric Meters for Question */}
                  {q.rubric && (
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 bg-slate-950/60 rounded-2xl p-3 border border-slate-800/60">
                      <MiniRubricBar label="Clarity" value={q.rubric.clarity} />
                      <MiniRubricBar label="Correctness" value={q.rubric.correctness} />
                      <MiniRubricBar label="Structure" value={q.rubric.structure} />
                      <MiniRubricBar label="Confidence" value={q.rubric.confidence} />
                    </div>
                  )}

                  {/* Candidate Response */}
                  <div className="space-y-1.5">
                    <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Candidate Response</p>
                    <div className="text-sm text-slate-200 bg-slate-950/80 border border-slate-800 rounded-2xl p-4 leading-relaxed whitespace-pre-wrap font-sans">
                      {q.userAnswer || <span className="italic text-slate-500">No response provided</span>}
                    </div>
                  </div>

                  {/* AI Evaluation */}
                  <div className="space-y-1.5">
                    <p className="text-xs font-semibold uppercase tracking-wider text-emerald-400">AI Feedback & Assessment</p>
                    <p className="text-sm text-slate-300 leading-relaxed bg-slate-900/60 rounded-2xl p-4 border border-slate-800/50">
                      {q.aiFeedback}
                    </p>
                  </div>

                  {/* Strengths & Actionable Tips */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {q.strengths?.length > 0 && (
                      <div className="bg-emerald-950/30 border border-emerald-900/40 rounded-xl p-3.5 space-y-1">
                        <p className="text-xs font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1">
                          <span>✓</span> Strengths
                        </p>
                        <ul className="text-xs text-slate-300 space-y-1">
                          {q.strengths.map((s, si) => (
                            <li key={si}>• {s}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {q.improvements?.length > 0 && (
                      <div className="bg-amber-950/30 border border-amber-900/40 rounded-xl p-3.5 space-y-1">
                        <p className="text-xs font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1">
                          <span>💡</span> Improvement Tips
                        </p>
                        <ul className="text-xs text-slate-300 space-y-1">
                          {q.improvements.map((imp, ii) => (
                            <li key={ii}>• {imp}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>

                  {/* Ideal Model Answer Accordion */}
                  {q.idealAnswer && (
                    <div className="bg-slate-950/60 rounded-2xl p-4 border border-slate-800 space-y-1">
                      <p className="text-xs font-bold text-indigo-400 uppercase tracking-wider flex items-center gap-1">
                        <span>🌟</span> Ideal Model Answer Snippet
                      </p>
                      <p className="text-xs text-slate-300 leading-relaxed italic bg-slate-900/80 p-3 rounded-xl border border-slate-800/80">
                        "{q.idealAnswer}"
                      </p>
                    </div>
                  )}
                </motion.div>
              ))}
            </div>
          </div>

          {/* Bottom Actions */}
          <div className="flex gap-4 pt-4">
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => navigate('/interview/new')}
              className="flex-1 bg-emerald-600 hover:bg-emerald-500 rounded-2xl py-4 font-bold text-white transition-all shadow-xl shadow-emerald-950/50 text-base"
            >
              Start Another Interview
            </motion.button>
            <Link
              to="/dashboard"
              className="flex-1 text-center border border-slate-700 hover:bg-slate-800 rounded-2xl py-4 font-bold text-slate-300 transition-colors text-base"
            >
              Back to Dashboard
            </Link>
          </div>
        </motion.div>
      </div>
    );
  }

  // ── 11. GENERATE SCREEN (status = pending) ──────────────────────────────────
  if (isPending) {
    return (
      <div className="min-h-screen bg-slate-950 text-white">
        <Navbar />
        <div className="max-w-2xl mx-auto px-4 py-12 space-y-6">
          <Link to="/dashboard" className="text-slate-400 hover:text-emerald-400 text-sm font-medium transition-colors">
            ← Back to Dashboard
          </Link>

          <div className="bg-slate-900 rounded-2xl p-6 space-y-3 border border-slate-800 shadow-xl">
            <div className="flex items-center justify-between">
              <h1 className="text-2xl font-bold capitalize text-white">{interview.role}</h1>
              <span className="text-xs px-3 py-1 bg-emerald-950/60 text-emerald-300 border border-emerald-800/60 rounded-full font-medium">
                {roundLabels[interview.roundType] || 'Technical Round'}
              </span>
            </div>
            <div className="flex flex-wrap gap-2 pt-1">
              {interview.techStack?.map((t) => (
                <span key={t} className="text-xs bg-slate-800 border border-slate-700 text-slate-300 px-3 py-1 rounded-full">
                  {t}
                </span>
              ))}
              <span className={`text-xs px-3 py-1 rounded-full capitalize border ${difficultyColor[interview.difficulty]}`}>
                {interview.difficulty}
              </span>
            </div>
          </div>

          <div className="bg-slate-900 rounded-2xl p-10 text-center space-y-5 border border-slate-800 shadow-xl">
            <div className="w-20 h-20 mx-auto rounded-full bg-emerald-950/40 border border-emerald-800/40 flex items-center justify-center text-4xl shadow-inner">
              🤖
            </div>
            <h2 className="text-2xl font-bold text-slate-100">Ready for your AI Interview?</h2>
            <p className="text-slate-400 text-sm max-w-md mx-auto leading-relaxed">
              The AI interviewer will conduct a session-based{' '}
              <span className="text-emerald-400 font-semibold">{interview.roundType || 'technical'}</span> interview with{' '}
              <span className="text-white font-semibold">
                {interview.difficulty === 'easy' ? 5 : interview.difficulty === 'medium' ? 7 : 10}
              </span>{' '}
              questions. Every answer is evaluated on clarity, correctness, structure, and confidence.
            </p>

            {genError && (
              <div role="alert" className="bg-rose-950/60 border border-rose-800 text-rose-300 rounded-xl p-4 text-sm text-left">
                <p className="font-semibold">⚠️ {genError}</p>
              </div>
            )}

            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleGenerate}
              disabled={generating}
              className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:opacity-60 disabled:cursor-not-allowed rounded-xl py-3.5 font-semibold text-white transition-all shadow-lg shadow-emerald-950/50"
            >
              {generating ? (
                <span className="flex items-center justify-center gap-2">
                  <Spinner /> Generating session questions…
                </span>
              ) : (
                'Start Interview Session'
              )}
            </motion.button>
          </div>
        </div>
      </div>
    );
  }

  // ── 12. ACTIVE SMART INTERVIEW UI (status = in_progress) ─────────────────────
  const radius = 32;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (timeLeft / QUESTION_TIMER_SECONDS) * circumference;

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col justify-between">
      <Navbar />

      <main className="max-w-7xl mx-auto px-4 py-6 w-full flex-1">
        {/* Top Header / Meta bar */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Link to="/dashboard" className="text-slate-400 hover:text-white text-sm transition-colors">
              ← Dashboard
            </Link>
            <span className="text-slate-600">|</span>
            <span className="text-xs uppercase tracking-wider px-3 py-0.5 rounded-full bg-emerald-950/60 text-emerald-300 border border-emerald-800/40 font-medium">
              {roundLabels[interview.roundType] || 'Technical Round'}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setCameraEnabled((prev) => !prev)}
              className="text-xs px-3 py-1.5 rounded-lg border border-slate-700 bg-slate-900 text-slate-300 hover:text-white transition-colors flex items-center gap-1.5"
            >
              📹 {cameraEnabled ? 'Hide Camera' : 'Show Camera'}
            </button>
          </div>
        </div>

        {/* Main Grid: Left Column (Avatar + Status) and Right Column (Q&A Area) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">

          {/* ── LEFT COLUMN (Avatar, speech bubble, status card) ── */}
          <div className="lg:col-span-5 space-y-4">

            {/* Avatar Card */}
            <div className="bg-slate-900 rounded-2xl overflow-hidden border border-slate-800 shadow-xl relative group">
              <div className="relative aspect-[4/3] bg-slate-950 flex items-center justify-center overflow-hidden">
                <img
                  src="/interviewer.jpg"
                  alt="AI Interviewer"
                  className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-500"
                />

                {/* AI Speaking Visualizer Badge */}
                {aiStatus === 'AI Speaking' && (
                  <div className="absolute top-3 right-3 bg-emerald-900/90 text-emerald-200 border border-emerald-500/60 px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-2 shadow-lg backdrop-blur-sm animate-pulse">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                    AI Speaking
                  </div>
                )}
              </div>
            </div>

            {/* AI Speech Bubble / Subtitle under Avatar */}
            {currentQ && (
              <AnimatePresence mode="wait">
                <motion.div
                  key={currentIdx}
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -5 }}
                  transition={{ duration: 0.2 }}
                  className="bg-slate-900/90 rounded-2xl p-4 border border-slate-800 shadow-lg relative"
                >
                  <div className="flex items-start justify-between gap-3">
                    <p className="text-sm text-slate-200 leading-relaxed font-medium">
                      "{currentQ.questionText}"
                    </p>
                    <button
                      onClick={() => speakQuestion(currentQ.questionText)}
                      title="Re-read question"
                      className="text-slate-400 hover:text-emerald-400 text-xs p-1.5 rounded-lg hover:bg-slate-800 transition-colors shrink-0"
                    >
                      🔊
                    </button>
                  </div>
                </motion.div>
              </AnimatePresence>
            )}

            {/* Interview Status Card */}
            <div className="bg-slate-900 rounded-2xl p-5 border border-slate-800 shadow-xl space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
                <span className="text-xs uppercase tracking-wider text-slate-400 font-semibold">
                  Interview Status
                </span>
                <span
                  className={`text-xs font-bold px-3 py-1 rounded-full ${
                    aiStatus === 'AI Speaking'
                      ? 'bg-emerald-950 text-emerald-400 border border-emerald-700/60'
                      : aiStatus === 'Listening'
                      ? 'bg-blue-950 text-blue-400 border border-blue-700/60 animate-pulse'
                      : aiStatus === 'Evaluating'
                      ? 'bg-amber-950 text-amber-400 border border-amber-700/60'
                      : 'bg-slate-800 text-slate-300 border border-slate-700'
                  }`}
                >
                  {aiStatus}
                </span>
              </div>

              {/* Circular Timer Widget */}
              <div className="flex items-center justify-center py-2">
                <div className="relative flex items-center justify-center">
                  <svg className="w-24 h-24 transform -rotate-90">
                    <circle
                      cx="48"
                      cy="48"
                      r={radius}
                      stroke="currentColor"
                      strokeWidth="6"
                      className="text-slate-800"
                      fill="transparent"
                    />
                    <circle
                      cx="48"
                      cy="48"
                      r={radius}
                      stroke="currentColor"
                      strokeWidth="6"
                      className={`transition-all duration-1000 ease-linear ${
                        timeLeft <= 10 ? 'text-rose-500' : 'text-emerald-500'
                      }`}
                      fill="transparent"
                      strokeDasharray={circumference}
                      strokeDashoffset={strokeDashoffset}
                      strokeLinecap="round"
                    />
                  </svg>
                  <div className="absolute text-center">
                    <span className={`text-xl font-bold ${timeLeft <= 10 ? 'text-rose-400' : 'text-slate-100'}`}>
                      {timeLeft}s
                    </span>
                  </div>
                </div>
              </div>

              {/* Progress Count Indicators */}
              <div className="flex items-center justify-between border-t border-slate-800/80 pt-3 px-2">
                <div className="text-center">
                  <span className="text-xl font-extrabold text-emerald-400 block leading-tight">
                    {currentIdx + 1}
                  </span>
                  <span className="text-xs text-slate-400 font-medium">Current Question</span>
                </div>
                <div className="h-8 w-px bg-slate-800" />
                <div className="text-center">
                  <span className="text-xl font-extrabold text-emerald-400 block leading-tight">
                    {questions.length}
                  </span>
                  <span className="text-xs text-slate-400 font-medium">Total Questions</span>
                </div>
              </div>
            </div>

          </div>

          {/* ── RIGHT COLUMN (Header, Question Card, Answer Box, Action Controls) ── */}
          <div className="lg:col-span-7 space-y-4">

            {/* Smart Interview Title */}
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold text-emerald-400 tracking-tight flex items-center gap-2">
                AI Smart Interview
              </h2>
              <span className="text-xs text-slate-400 font-medium">
                {answeredCount} of {questions.length} completed
              </span>
            </div>

            {/* Question Card with Slide Transition */}
            <AnimatePresence mode="wait">
              {currentQ && (
                <motion.div
                  key={currentIdx}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.25 }}
                  className="bg-slate-900/90 rounded-2xl p-6 border border-slate-800 shadow-xl space-y-2"
                >
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    Question {currentIdx + 1} of {questions.length}
                  </p>
                  <h3 className="text-lg font-bold text-slate-100 leading-snug">
                    {currentQ.questionText}
                  </h3>
                </motion.div>
              )}
            </AnimatePresence>

            {/* If current question was already evaluated / answered */}
            {currentAnswered ? (
              <div className="space-y-4">
                <div className="bg-slate-900 rounded-2xl p-5 border border-slate-800 shadow-xl space-y-2">
                  <p className="text-xs uppercase tracking-wider text-slate-400 font-semibold">Your Answer</p>
                  <p className="text-sm text-slate-300 leading-relaxed whitespace-pre-wrap">
                    {currentQ.userAnswer}
                  </p>
                </div>

                <div className={`rounded-2xl border p-5 space-y-4 ${scoreBg(currentQ.score)} shadow-xl`}>
                  <div className="flex items-center justify-between border-b border-slate-800/60 pb-3">
                    <p className="text-xs uppercase tracking-wider text-emerald-400 font-semibold">AI Feedback & Rubric</p>
                    <span className={`text-lg font-bold ${scoreColor(currentQ.score)}`}>
                      Score: {currentQ.score}/10
                    </span>
                  </div>

                  {/* 4 Rubric Bars */}
                  {currentQ.rubric && (
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 bg-slate-950/60 rounded-xl p-3 border border-slate-800/60">
                      <MiniRubricBar label="Clarity" value={currentQ.rubric.clarity} />
                      <MiniRubricBar label="Correctness" value={currentQ.rubric.correctness} />
                      <MiniRubricBar label="Structure" value={currentQ.rubric.structure} />
                      <MiniRubricBar label="Confidence" value={currentQ.rubric.confidence} />
                    </div>
                  )}

                  <p className="text-sm text-slate-300 leading-relaxed">{currentQ.aiFeedback}</p>

                  {/* Strengths & Improvements */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                    {currentQ.strengths?.length > 0 && (
                      <div className="bg-emerald-950/30 border border-emerald-900/40 rounded-xl p-3">
                        <span className="font-bold text-emerald-400">✓ Strengths:</span>
                        <ul className="mt-1 text-slate-300 space-y-0.5">
                          {currentQ.strengths.map((s, si) => <li key={si}>• {s}</li>)}
                        </ul>
                      </div>
                    )}
                    {currentQ.improvements?.length > 0 && (
                      <div className="bg-amber-950/30 border border-amber-900/40 rounded-xl p-3">
                        <span className="font-bold text-amber-400">💡 Tips:</span>
                        <ul className="mt-1 text-slate-300 space-y-0.5">
                          {currentQ.improvements.map((imp, ii) => <li key={ii}>• {imp}</li>)}
                        </ul>
                      </div>
                    )}
                  </div>

                  {/* Ideal Answer Toggle */}
                  {currentQ.idealAnswer && (
                    <div className="pt-1">
                      <button
                        onClick={() => setShowIdealAnswer(prev => !prev)}
                        className="text-xs text-indigo-400 hover:text-indigo-300 font-semibold flex items-center gap-1"
                      >
                        {showIdealAnswer ? 'Hide Sample Model Answer ▲' : 'Show Ideal Model Answer ▼'}
                      </button>
                      {showIdealAnswer && (
                        <p className="mt-2 text-xs text-slate-300 italic bg-slate-950/80 p-3 rounded-xl border border-slate-800">
                          "{currentQ.idealAnswer}"
                        </p>
                      )}
                    </div>
                  )}
                </div>

                {!isLastQuestion ? (
                  <motion.button
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.99 }}
                    onClick={handleNext}
                    className="w-full bg-emerald-600 hover:bg-emerald-500 rounded-xl py-3.5 font-semibold text-white transition-all shadow-lg shadow-emerald-950/40 flex items-center justify-center gap-2"
                  >
                    Next Question →
                  </motion.button>
                ) : (
                  <motion.button
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.99 }}
                    onClick={() => setInterview((prev) => ({ ...prev, status: 'completed' }))}
                    className="w-full bg-emerald-600 hover:bg-emerald-500 rounded-xl py-3.5 font-semibold text-white transition-all shadow-lg"
                  >
                    View Final Comprehensive Feedback Report 🎉
                  </motion.button>
                )}
              </div>
            ) : (
              /* Answer input area & control bar */
              <div className="space-y-4">
                <div className="relative">
                  <textarea
                    ref={answerRef}
                    rows={11}
                    value={answer}
                    onChange={(e) => setAnswer(e.target.value)}
                    placeholder="Type your answer here or click the microphone to speak..."
                    className="w-full bg-slate-900/90 border border-slate-800 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 text-white rounded-2xl p-5 outline-none resize-none placeholder-slate-500 transition-all text-base leading-relaxed shadow-xl"
                  />
                  {isRecording && (
                    <div className="absolute top-4 right-4 flex items-center gap-2 bg-rose-950/80 border border-rose-800 text-rose-300 px-3 py-1 rounded-full text-xs font-semibold animate-pulse">
                      <span className="w-2 h-2 rounded-full bg-rose-500" />
                      Recording Voice...
                    </div>
                  )}
                </div>

                {/* Inline feedback if returned right after submission */}
                {latestFeedback && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.98 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className={`rounded-2xl border p-5 space-y-3 ${scoreBg(latestFeedback.score)} shadow-xl`}
                  >
                    <div className="flex items-center justify-between border-b border-slate-800/60 pb-2">
                      <p className="text-xs uppercase tracking-wider text-emerald-400 font-semibold">AI Evaluation & Rubric</p>
                      <span className={`text-lg font-bold ${scoreColor(latestFeedback.score)}`}>
                        {latestFeedback.score}/10
                      </span>
                    </div>

                    {latestFeedback.rubric && (
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 bg-slate-950/60 rounded-xl p-3 border border-slate-800/60">
                        <MiniRubricBar label="Clarity" value={latestFeedback.rubric.clarity} />
                        <MiniRubricBar label="Correctness" value={latestFeedback.rubric.correctness} />
                        <MiniRubricBar label="Structure" value={latestFeedback.rubric.structure} />
                        <MiniRubricBar label="Confidence" value={latestFeedback.rubric.confidence} />
                      </div>
                    )}

                    <p className="text-sm text-slate-200 leading-relaxed">{latestFeedback.feedback}</p>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                      {latestFeedback.strengths?.length > 0 && (
                        <div className="bg-emerald-950/30 border border-emerald-900/40 rounded-xl p-3">
                          <span className="font-bold text-emerald-400">✓ Strengths:</span>
                          <ul className="mt-1 text-slate-300 space-y-0.5">
                            {latestFeedback.strengths.map((s, si) => <li key={si}>• {s}</li>)}
                          </ul>
                        </div>
                      )}
                      {latestFeedback.improvements?.length > 0 && (
                        <div className="bg-amber-950/30 border border-amber-900/40 rounded-xl p-3">
                          <span className="font-bold text-amber-400">💡 Tips:</span>
                          <ul className="mt-1 text-slate-300 space-y-0.5">
                            {latestFeedback.improvements.map((imp, ii) => <li key={ii}>• {imp}</li>)}
                          </ul>
                        </div>
                      )}
                    </div>

                    {!isLastQuestion ? (
                      <motion.button
                        whileHover={{ scale: 1.01 }}
                        whileTap={{ scale: 0.99 }}
                        onClick={handleNext}
                        className="w-full mt-3 bg-emerald-600 hover:bg-emerald-500 rounded-xl py-3 font-semibold text-white text-sm transition-all shadow-md"
                      >
                        Next Question →
                      </motion.button>
                    ) : (
                      <motion.button
                        whileHover={{ scale: 1.01 }}
                        whileTap={{ scale: 0.99 }}
                        onClick={() => setInterview((prev) => ({ ...prev, status: 'completed' }))}
                        className="w-full mt-3 bg-emerald-600 hover:bg-emerald-500 rounded-xl py-3 font-semibold text-white text-sm transition-all shadow-md"
                      >
                        View Final Feedback Report 🎉
                      </motion.button>
                    )}
                  </motion.div>
                )}

                {submitError && (
                  <div role="alert" className="bg-rose-950/80 border border-rose-800 text-rose-300 rounded-xl p-4 text-sm">
                    {submitError}
                  </div>
                )}

                {/* Bottom Action Bar */}
                {!latestFeedback && (
                  <div className="flex items-center gap-3 pt-2">
                    {/* Microphone Button */}
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      type="button"
                      onClick={toggleRecording}
                      title={isRecording ? 'Stop Recording' : 'Record voice answer'}
                      className={`w-14 h-14 rounded-full flex items-center justify-center text-xl transition-all shadow-lg shrink-0 ${
                        isRecording
                          ? 'bg-rose-600 text-white ring-4 ring-rose-900/60 scale-105'
                          : 'bg-black hover:bg-slate-800 text-white border border-slate-700 hover:border-slate-500'
                      }`}
                    >
                      {isRecording ? '⏹' : '🎤'}
                    </motion.button>

                    {/* Submit Answer Button */}
                    <motion.button
                      whileHover={{ scale: 1.01 }}
                      whileTap={{ scale: 0.99 }}
                      type="button"
                      onClick={handleSubmitAnswer}
                      disabled={submitting || !answer.trim()}
                      className="flex-1 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed rounded-2xl h-14 font-bold text-white transition-all shadow-lg shadow-emerald-950/40 text-base flex items-center justify-center gap-2"
                    >
                      {submitting ? (
                        <span className="flex items-center gap-2">
                          <Spinner /> Evaluating Answer…
                        </span>
                      ) : (
                        'Submit Answer'
                      )}
                    </motion.button>
                  </div>
                )}
              </div>
            )}

          </div>
        </div>
      </main>

      {/* ── FLOATING WEBCAM VIDEO PREVIEW (Bottom Right PIP) ── */}
      {cameraEnabled && interview?.status === 'in_progress' && (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="fixed bottom-6 right-6 w-44 sm:w-52 aspect-[4/3] rounded-2xl overflow-hidden border-2 border-slate-700 bg-slate-900 shadow-2xl z-40"
        >
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="w-full h-full object-cover transform -scale-x-100"
          />
          {cameraError && (
            <div className="absolute inset-0 flex items-center justify-center p-2 text-center text-xs text-slate-400 bg-slate-900">
              {cameraError}
            </div>
          )}
          <div className="absolute bottom-2 left-2 bg-black/70 px-2 py-0.5 rounded text-[10px] text-slate-300 font-mono flex items-center gap-1 backdrop-blur-sm">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            LIVE
          </div>
        </motion.div>
      )}
    </div>
  );
}

function RubricCard({ title, score, desc }) {
  const s = score != null ? score : 0;
  return (
    <motion.div
      whileHover={{ y: -3 }}
      className="bg-slate-950/80 border border-slate-800 rounded-2xl p-3.5 text-center space-y-1.5"
    >
      <p className="text-xs font-bold text-slate-300 uppercase tracking-wide">{title}</p>
      <div className={`text-2xl font-black ${scoreColor(s)}`}>
        {s}<span className="text-slate-500 text-xs font-normal">/10</span>
      </div>
      <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${Math.min(100, Math.max(0, s * 10))}%` }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
          className={`h-full ${s >= 8 ? 'bg-emerald-500' : s >= 5 ? 'bg-amber-500' : 'bg-rose-500'}`}
        />
      </div>
      <p className="text-[10px] text-slate-400">{desc}</p>
    </motion.div>
  );
}

function MiniRubricBar({ label, value }) {
  const v = value != null ? value : 0;
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-[11px]">
        <span className="text-slate-400 font-medium">{label}</span>
        <span className={`font-bold ${scoreColor(v)}`}>{v}/10</span>
      </div>
      <div className="w-full bg-slate-800 h-1 rounded-full overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${Math.min(100, Math.max(0, v * 10))}%` }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
          className={`h-full ${v >= 8 ? 'bg-emerald-500' : v >= 5 ? 'bg-amber-500' : 'bg-rose-500'}`}
        />
      </div>
    </div>
  );
}

function Spinner() {
  return (
    <svg
      className="animate-spin h-5 w-5 text-white"
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
      />
    </svg>
  );
}
