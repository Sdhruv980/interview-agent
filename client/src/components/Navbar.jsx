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
          <div className="flex items-center gap-4">
            <span className="text-sm text-slate-400 hidden sm:block">
              {user.name}
            </span>
            <span className="text-sm bg-indigo-900 text-indigo-300 px-3 py-1 rounded-full">
              {user.credits} credit{user.credits !== 1 ? 's' : ''}
            </span>
            <Link
              to="/interview/new"
              className="text-sm bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-1.5 rounded-lg transition-colors"
            >
              New interview
            </Link>
            <button
              onClick={handleLogout}
              className="text-sm text-slate-400 hover:text-white transition-colors"
            >
              Sign out
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
