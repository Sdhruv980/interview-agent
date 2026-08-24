import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Navbar from '../components/Navbar';
import api from '../lib/api';

const STATUS_BADGE = {
  pending:     'bg-yellow-900/50 text-yellow-300',
  in_progress: 'bg-blue-900/50 text-blue-300',
  completed:   'bg-green-900/50 text-green-300',
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
    <div className="min-h-screen bg-slate-900 text-white">
      <Navbar />

      <div className="max-w-6xl mx-auto px-4 py-10">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold">My Interviews</h1>
          <Link
            to="/interview/new"
            className="bg-indigo-600 hover:bg-indigo-500 text-white px-5 py-2 rounded-lg font-medium transition-colors"
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
          <div className="text-center py-20 space-y-4">
            <p className="text-slate-400 text-lg">No interviews yet.</p>
            <Link
              to="/interview/new"
              className="inline-block bg-indigo-600 hover:bg-indigo-500 text-white px-6 py-2.5 rounded-lg font-medium transition-colors"
            >
              Start your first interview
            </Link>
          </div>
        )}

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {interviews.map((interview) => (
            <div
              key={interview._id}
              className="bg-slate-800 rounded-xl p-5 space-y-3 border border-slate-700 hover:border-slate-500 transition-colors"
            >
              <div className="flex items-start justify-between gap-2">
                <h2 className="font-semibold text-lg leading-tight">
                  {interview.role}
                </h2>
                <span
                  className={`text-xs px-2 py-0.5 rounded-full whitespace-nowrap ${STATUS_BADGE[interview.status]}`}
                >
                  {interview.status.replace('_', ' ')}
                </span>
              </div>

              {interview.techStack?.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {interview.techStack.map((t) => (
                    <span
                      key={t}
                      className="text-xs bg-slate-700 text-slate-300 px-2 py-0.5 rounded"
                    >
                      {t}
                    </span>
                  ))}
                </div>
              )}

              <div className="text-sm text-slate-400">
                {interview.difficulty} &middot;{' '}
                {new Date(interview.createdAt).toLocaleDateString()}
              </div>

              {interview.overallScore != null && (
                <div className="text-sm font-medium text-indigo-400">
                  Score: {interview.overallScore} / 10
                </div>
              )}

              <div className="flex gap-3 pt-1">
                <Link
                  to={`/interview/${interview._id}`}
                  className="text-sm text-indigo-400 hover:text-indigo-300 transition-colors"
                >
                  {interview.status === 'completed' ? 'View results' : 'Continue'}
                </Link>
                <button
                  onClick={() => handleDelete(interview._id)}
                  className="text-sm text-slate-500 hover:text-red-400 transition-colors ml-auto"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
