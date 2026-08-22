import Link from 'next/link';

export default function HomePage() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 text-white flex flex-col items-center justify-center px-4">
      <div className="max-w-2xl w-full text-center space-y-6">
        <h1 className="text-5xl font-bold tracking-tight">
          Interview <span className="text-indigo-400">Agent</span>
        </h1>
        <p className="text-lg text-slate-300">
          Practice technical interviews with an AI that gives you real-time questions,
          evaluates your answers, and delivers actionable feedback — all tailored to
          your target role and stack.
        </p>

        <div className="flex gap-4 justify-center pt-2">
          <Link
            href="/register"
            className="px-6 py-3 bg-indigo-600 hover:bg-indigo-500 rounded-lg font-medium transition-colors"
          >
            Get started free
          </Link>
          <Link
            href="/login"
            className="px-6 py-3 border border-slate-600 hover:border-slate-400 rounded-lg font-medium transition-colors"
          >
            Sign in
          </Link>
        </div>

        <div className="grid grid-cols-3 gap-6 pt-10 text-sm text-slate-400">
          <div className="space-y-1">
            <p className="text-2xl font-bold text-white">AI-powered</p>
            <p>Questions generated for your exact role & stack</p>
          </div>
          <div className="space-y-1">
            <p className="text-2xl font-bold text-white">Instant feedback</p>
            <p>Score and detailed critique per answer</p>
          </div>
          <div className="space-y-1">
            <p className="text-2xl font-bold text-white">5 free credits</p>
            <p>Start practicing with no credit card required</p>
          </div>
        </div>
      </div>
    </main>
  );
}
