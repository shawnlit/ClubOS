import { Link } from 'react-router-dom';

export default function Home() {
  return (
    <div className="max-w-2xl mx-auto text-center py-12">
      <span className="text-xs font-semibold tracking-wider text-neutral-500 uppercase">Home</span>
      <h1 className="text-4xl font-bold tracking-tight text-neutral-900 mt-2 mb-3">
        ClubOS
      </h1>
      <p className="text-lg text-neutral-600 mb-8">
        One place to manage your club.
      </p>
      <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
        <Link
          to="/user"
          className="w-full sm:w-auto px-5 py-2.5 bg-neutral-900 text-white rounded-md text-sm font-medium hover:bg-neutral-800 transition-colors"
        >
          User Dashboard
        </Link>
        <Link
          to="/admin"
          className="w-full sm:w-auto px-5 py-2.5 bg-white text-neutral-900 border border-neutral-300 rounded-md text-sm font-medium hover:bg-neutral-100 transition-colors"
        >
          Admin Dashboard
        </Link>
      </div>
    </div>
  );
}
