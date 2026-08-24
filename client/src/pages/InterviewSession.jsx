import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import Navbar from '../components/Navbar';
import api from '../lib/api';

export default function InterviewSession() {
  const { id } = useParams();
  const [interview, setInterview] = useState(null);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState('');

  useEffect(() => {
    api.get(`/interviews/${id}`)
      .then((res) => setInterview(res.data.data))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 text-white flex items-center justify-center">
        <p className="text-slate-400 animate-pulse">Loading interview…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-900 text-white flex items-center justify-center flex-col gap-4">
        <p className="text-red-400">{error}</p>
        <Link to="/dashboard" className="text-indigo-400 hover:underline">
          Back to dashboard
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 text-white">
      <Navbar />
      <div className="max-w-3xl mx-auto px-4 py-10 space-y-6">
        <div className="flex items-center gap-3">
          <Link to="/dashboard" className="text-slate-400 hover:text-white text-sm">
            ← Dashboard
          </Link>
        </div>

        <div className="bg-slate-800 rounded-xl p-6 space-y-2">
          <h1 className="text-2xl font-bold">{interview.role}</h1>
          <div className="flex flex-wrap gap-2 text-sm">
            {interview.techStack?.map((t) => (
              <span key={t} className="bg-slate-700 text-slate-300 px-2 py-0.5 rounded">
                {t}
              </span>
            ))}
            <span className="text-slate-400 capitalize">{interview.difficulty}</span>
          </div>
        </div>

        {/* Placeholder — AI question/answer flow will go here */}
        <div className="bg-slate-800 rounded-xl p-8 text-center space-y-3 border border-dashed border-slate-600">
          <p className="text-slate-400">
            AI question generation will be wired in the next step.
          </p>
          <p className="text-sm text-slate-500">
            Interview ID: <span className="font-mono">{id}</span>
          </p>
        </div>
      </div>
    </div>
  );
}
