import { Link } from 'react-router-dom';

export default function NotFound() {
  return (
    <main className="min-h-screen bg-slate-900 text-white flex flex-col items-center justify-center gap-4">
      <h1 className="text-6xl font-bold text-slate-700">404</h1>
      <p className="text-slate-400">Page not found.</p>
      <Link to="/" className="text-indigo-400 hover:underline">
        Go home
      </Link>
    </main>
  );
}
