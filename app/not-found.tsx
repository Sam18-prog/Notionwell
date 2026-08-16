import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center text-center space-y-4">
      <h2 className="text-4xl font-extrabold text-white">404 — Page Not Found</h2>
      <p className="text-slate-400 text-sm">
        The study page or deck you are looking for does not exist.
      </p>
      <Link
        href="/"
        className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-xs transition-colors"
      >
        Return to Dashboard
      </Link>
    </div>
  );
}
