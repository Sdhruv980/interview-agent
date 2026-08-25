import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import Navbar from '../components/Navbar';
import { useAuth } from '../context/AuthContext';
import api from '../lib/api';

const TECH_OPTIONS = [
  'React', 'Vue', 'Angular', 'Node.js', 'Express',
  'MongoDB', 'PostgreSQL', 'TypeScript', 'Python',
  'Django', 'Docker', 'AWS', 'GraphQL', 'REST',
];

export default function NewInterview() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [role, setRole]             = useState('');
  const [roundType, setRoundType]   = useState('technical');
  const [techStack, setTechStack]   = useState([]);
  const [difficulty, setDifficulty] = useState('medium');
  const [error, setError]           = useState('');
  const [loading, setLoading]       = useState(false);

  const toggleTech = (tech) =>
    setTechStack((prev) =>
      prev.includes(tech) ? prev.filter((t) => t !== tech) : [...prev, tech]
    );

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const { data } = await api.post('/interviews', {
        role,
        roundType,
        techStack: roundType === 'hr' ? [] : techStack,
        difficulty,
      });
      navigate(`/interview/${data.data._id}`);
    } catch (err) {
      setError(err.response?.data?.message || err.message);
      setLoading(false);
    }
  };

  const hasNoCredits = user && user.credits < 1;

  return (
    <div className="min-h-screen bg-slate-900 text-white">
      <Navbar />
      <div className="max-w-2xl mx-auto px-4 py-10">
        <h1 className="text-3xl font-bold mb-2">New Interview</h1>
        <p className="text-slate-400 text-sm mb-8">Customize your session round type, role, and difficulty</p>

        <form onSubmit={handleSubmit} className="bg-slate-800 rounded-xl p-8 space-y-6 border border-slate-700">
          {hasNoCredits && (
            <div role="alert" className="bg-amber-950/70 border border-amber-800 text-amber-300 rounded-xl p-4 text-sm flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span>⚠️</span>
                <span>You have <strong>0 credits</strong> remaining. Starting an interview costs 1 credit.</span>
              </div>
              <Link to="/buy-credits" className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold px-3 py-1 rounded-lg text-xs transition-colors shrink-0">
                Buy Credits →
              </Link>
            </div>
          )}

          {error && (
            <div role="alert" className="bg-red-900/40 border border-red-700 text-red-300 rounded-lg p-3 text-sm">
              {error}
            </div>
          )}

          {/* Round Type Selection */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-slate-200">
              Select Round Type <span className="text-emerald-400">*</span>
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <button
                type="button"
                onClick={() => setRoundType('technical')}
                className={`p-4 rounded-xl border text-left transition-all ${
                  roundType === 'technical'
                    ? 'bg-emerald-950/40 border-emerald-500 ring-1 ring-emerald-500'
                    : 'bg-slate-700/50 border-slate-600 hover:border-slate-500'
                }`}
              >
                <div className="text-2xl mb-1">💻</div>
                <div className="font-semibold text-white text-sm">Technical Round</div>
                <div className="text-xs text-slate-400 mt-1">Coding, architecture, framework concepts & algorithms</div>
              </button>

              <button
                type="button"
                onClick={() => setRoundType('hr')}
                className={`p-4 rounded-xl border text-left transition-all ${
                  roundType === 'hr'
                    ? 'bg-emerald-950/40 border-emerald-500 ring-1 ring-emerald-500'
                    : 'bg-slate-700/50 border-slate-600 hover:border-slate-500'
                }`}
              >
                <div className="text-2xl mb-1">🤝</div>
                <div className="font-semibold text-white text-sm">HR & Behavioral</div>
                <div className="text-xs text-slate-400 mt-1">Culture fit, STAR scenarios, teamwork & career goals</div>
              </button>

              <button
                type="button"
                onClick={() => setRoundType('mixed')}
                className={`p-4 rounded-xl border text-left transition-all ${
                  roundType === 'mixed'
                    ? 'bg-emerald-950/40 border-emerald-500 ring-1 ring-emerald-500'
                    : 'bg-slate-700/50 border-slate-600 hover:border-slate-500'
                }`}
              >
                <div className="text-2xl mb-1">🎯</div>
                <div className="font-semibold text-white text-sm">Mixed Round</div>
                <div className="text-xs text-slate-400 mt-1">Comprehensive blend of technical & HR questions</div>
              </button>
            </div>
          </div>

          {/* Role */}
          <div className="space-y-1">
            <label htmlFor="role" className="block text-sm text-slate-300">
              Target role <span className="text-emerald-400">*</span>
            </label>
            <input
              id="role"
              type="text"
              required
              placeholder="e.g. Frontend Developer, Full Stack Engineer, Product Specialist"
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="w-full bg-slate-700 text-white rounded-lg px-4 py-2.5 outline-none focus:ring-2 focus:ring-emerald-500 placeholder-slate-500 border border-slate-600"
            />
          </div>

          {/* Tech stack (optional for HR round, shown for Technical & Mixed) */}
          {roundType !== 'hr' && (
            <div className="space-y-2">
              <p className="text-sm text-slate-300">Tech stack (select all that apply)</p>
              <div className="flex flex-wrap gap-2">
                {TECH_OPTIONS.map((tech) => (
                  <button
                    key={tech}
                    type="button"
                    onClick={() => toggleTech(tech)}
                    className={`text-sm px-3 py-1 rounded-full border transition-colors ${
                      techStack.includes(tech)
                        ? 'bg-emerald-600 border-emerald-500 text-white'
                        : 'bg-slate-700 border-slate-600 text-slate-300 hover:border-slate-400'
                    }`}
                  >
                    {tech}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Difficulty */}
          <div className="space-y-2">
            <p className="text-sm text-slate-300">Difficulty</p>
            <div className="flex gap-3">
              {['easy', 'medium', 'hard'].map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => setDifficulty(d)}
                  className={`flex-1 py-2 rounded-lg border capitalize text-sm font-medium transition-colors ${
                    difficulty === d
                      ? 'bg-emerald-600 border-emerald-500 text-white'
                      : 'bg-slate-700 border-slate-600 text-slate-300 hover:border-slate-400'
                  }`}
                >
                  {d}
                </button>
              ))}
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:opacity-60 disabled:cursor-not-allowed rounded-lg py-3 font-medium text-white transition-colors shadow-lg shadow-emerald-900/20"
          >
            {loading ? 'Creating session…' : 'Start Interview (1 credit)'}
          </button>
        </form>
      </div>
    </div>
  );
}
