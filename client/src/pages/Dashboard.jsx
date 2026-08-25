import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import Navbar from '../components/Navbar';
import api from '../lib/api';

const STATUS_BADGE = {
  pending:     'bg-amber-900/50 text-amber-300 border border-amber-800/40',
  in_progress: 'bg-blue-900/50 text-blue-300 border border-blue-800/40',
  completed:   'bg-emerald-900/50 text-emerald-300 border border-emerald-800/40',
};

const ROUND_LABEL = {
  technical: '💻 Technical',
  hr:        '🤝 HR / Behavioral',
  mixed:     '🎯 Mixed',
};

export default function Dashboard() {
  const [interviews, setInterviews] = useState([]);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState('');

  useEffect(() => {
    api.get('/interviews')
      .then((res) => setInterviews(res.data.data))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this interview?')) return;
    try {
      await api.delete(`/interviews/${id}`);
      setInterviews((prev) => prev.filter((i) => i._id !== id));
    } catch (err) {
      alert(err.message);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white pb-16">
      <Navbar />

      <div className="max-w-6xl mx-auto px-4 py-10">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-extrabold">My Interviews</h1>
            <p className="text-sm text-slate-400 mt-1">Review your interview history and practice progress</p>
          </div>
          <Link
            to="/interview/new"
            className="bg-emerald-600 hover:bg-emerald-500 text-white px-5 py-2.5 rounded-2xl font-bold transition-all shadow-lg shadow-emerald-950/40 active:scale-95"
          >
            + New Interview
          </Link>
        </div>

        {loading && (
          <p className="text-slate-400 animate-pulse">Loading interviews…</p>
        )}

        {error && (
          <div className="bg-red-900/40 border border-red-700 text-red-300 rounded-lg p-4">
            {error}
          </div>
        )}

        {!loading && !error && interviews.length === 0 && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center py-20 space-y-4 bg-slate-900/60 rounded-3xl border border-slate-800 p-8 shadow-xl"
          >
            <div className="text-4xl">🎙️</div>
            <p className="text-slate-200 text-lg font-bold">No interviews yet.</p>
            <p className="text-slate-400 text-sm max-w-sm mx-auto">Start practicing technical or HR interviews with instant AI feedback.</p>
            <Link
              to="/interview/new"
              className="inline-block bg-emerald-600 hover:bg-emerald-500 text-white px-6 py-3 rounded-2xl font-bold transition-all shadow-lg shadow-emerald-950/40"
            >
              Start your first interview
            </Link>
          </motion.div>
        )}

        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {interviews.map((interview, i) => (
            <motion.div
              key={interview._id}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25, delay: i * 0.04 }}
              whileHover={{ y: -4 }}
              className="bg-slate-900 rounded-3xl p-6 space-y-3.5 border border-slate-800 hover:border-slate-700 transition-colors shadow-xl flex flex-col justify-between"
            >
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <h2 className="font-bold text-lg leading-tight capitalize text-white">
                    {interview.role}
                  </h2>
                  <span
                    className={`text-xs px-2.5 py-0.5 rounded-full whitespace-nowrap font-medium ${STATUS_BADGE[interview.status]}`}
                  >
                    {interview.status.replace('_', ' ')}
                  </span>
                </div>

                {/* Round Type Pill */}
                <div className="flex items-center gap-2">
                  <span className="text-xs bg-slate-950 text-emerald-300 border border-emerald-900/50 px-2.5 py-0.5 rounded-full font-medium">
                    {ROUND_LABEL[interview.roundType] || '💻 Technical'}
                  </span>
                </div>

                {interview.techStack?.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {interview.techStack.map((t) => (
                      <span
                        key={t}
                        className="text-xs bg-slate-800 text-slate-300 px-2 py-0.5 rounded-md"
                      >
                        {t}
                      </span>
                    ))}
                  </div>
                )}

                <div className="text-xs text-slate-400 capitalize">
                  {interview.difficulty} &middot;{' '}
                  {new Date(interview.createdAt).toLocaleDateString()}
                </div>

                {interview.overallScore != null && (
                  <div className="text-sm font-bold text-emerald-400 bg-emerald-950/40 border border-emerald-800/40 rounded-xl p-2.5 text-center">
                    Score: {interview.overallScore} / 10
                  </div>
                )}
              </div>

              <div className="flex items-center gap-3 pt-3 border-t border-slate-800">
                <Link
                  to={`/interview/${interview._id}`}
                  className="text-sm font-bold text-emerald-400 hover:text-emerald-300 transition-colors"
                >
                  {interview.status === 'completed' ? 'View Full Report →' : 'Continue Interview →'}
                </Link>
                <button
                  onClick={() => handleDelete(interview._id)}
                  className="text-xs text-slate-500 hover:text-rose-400 transition-colors ml-auto px-2 py-1"
                >
                  Delete
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}
