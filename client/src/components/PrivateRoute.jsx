import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function PrivateRoute() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <span className="text-slate-400 text-sm animate-pulse">Loading…</span>
      </div>
    );
  }

  return user ? <Outlet /> : <Navigate to="/login" replace />;
}
