import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate         = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <header className="bg-slate-800 border-b border-slate-700">
      <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
        <Link to="/" className="text-xl font-bold text-white">
          Interview <span className="text-indigo-400">Agent</span>
        </Link>

        {user && (
          <div className="flex items-center gap-3 sm:gap-4">
            <Link
              to="/dashboard"
              className="text-sm text-slate-300 hover:text-white transition-colors"
            >
              Dashboard
            </Link>

            <Link
              to="/buy-credits"
              className="text-sm bg-slate-900 hover:bg-slate-800 border border-slate-700 text-emerald-300 px-3 py-1.5 rounded-xl transition-all flex items-center gap-1.5 shadow-sm"
              title="Buy more credits"
            >
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              <span className="font-bold">{user.credits ?? 0}</span>
              <span className="text-xs text-slate-400">credits</span>
              <span className="text-emerald-400 font-bold ml-0.5">+</span>
            </Link>

            <Link
              to="/interview/new"
              className="text-sm bg-emerald-600 hover:bg-emerald-500 font-semibold text-white px-3.5 py-1.5 rounded-xl transition-all shadow-md shadow-emerald-950/40"
            >
              + New Interview
            </Link>

            <button
              onClick={handleLogout}
              className="text-xs text-slate-400 hover:text-white transition-colors px-2 py-1"
            >
              Sign out
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
