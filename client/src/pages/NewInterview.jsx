import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import api from '../lib/api';

const TECH_OPTIONS = [
  'React', 'Vue', 'Angular', 'Node.js', 'Express',
  'MongoDB', 'PostgreSQL', 'TypeScript', 'Python',
  'Django', 'Docker', 'AWS', 'GraphQL', 'REST',
];

export default function NewInterview() {
  const navigate = useNavigate();

  const [role, setRole]           = useState('');
  const [techStack, setTechStack] = useState([]);
  const [difficulty, setDifficulty] = useState('medium');
  const [error, setError]         = useState('');
  const [loading, setLoading]     = useState(false);

  const toggleTech = (tech) =>
    setTechStack((prev) =>
      prev.includes(tech) ? prev.filter((t) => t !== tech) : [...prev, tech]
    );

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const { data } = await api.post('/interviews', { role, techStack, difficulty });
      navigate(`/interview/${data.data._id}`);
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 text-white">
      <Navbar />
      <div className="max-w-2xl mx-auto px-4 py-10">
        <h1 className="text-3xl font-bold mb-8">New Interview</h1>

        <form onSubmit={handleSubmit} className="bg-slate-800 rounded-xl p-8 space-y-6">
          {error && (
            <div role="alert" className="bg-red-900/40 border border-red-700 text-red-300 rounded-lg p-3 text-sm">
              {error}
            </div>
          )}

          {/* Role */}
          <div className="space-y-1">
            <label htmlFor="role" className="block text-sm text-slate-300">
              Target role <span className="text-red-400">*</span>
            </label>
            <input
              id="role"
              type="text"
              required
              placeholder="e.g. Frontend Engineer, Full Stack Developer"
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="w-full bg-slate-700 text-white rounded-lg px-4 py-2.5 outline-none focus:ring-2 focus:ring-indigo-500 placeholder-slate-500"
            />
          </div>

          {/* Tech stack */}
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
                      ? 'bg-indigo-600 border-indigo-500 text-white'
                      : 'bg-slate-700 border-slate-600 text-slate-300 hover:border-slate-400'
                  }`}
                >
                  {tech}
                </button>
              ))}
            </div>
          </div>

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
                      ? 'bg-indigo-600 border-indigo-500 text-white'
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
            className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:opacity-60 disabled:cursor-not-allowed rounded-lg py-3 font-medium text-white transition-colors"
          >
            {loading ? 'Creating…' : 'Start interview (1 credit)'}
          </button>
        </form>
      </div>
    </div>
  );
}
