import { Link } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { useLoad } from '../../hooks/useLoad';
import { listClubs, listMyMemberships } from '../../services/clubs';
import StatusBadge from '../../components/ui/StatusBadge';

export default function UserDashboard() {
  const { user } = useAuth();
  const memberships = useLoad(listMyMemberships);
  const clubs = useLoad(listClubs);
  const nameOf = (clubId: string) =>
    clubs.data?.find((c) => c.clubId === clubId)?.name ?? clubId;

  return (
    <div>
      <div className="bg-white border border-neutral-200 rounded-lg p-6 sm:p-8">
        <span className="text-xs font-semibold tracking-wider text-neutral-500 uppercase">User Dashboard</span>
        <h1 className="text-2xl font-bold text-neutral-900 mt-1 mb-4">User Dashboard</h1>
        <p className="text-neutral-600">Welcome to the ClubOS User Dashboard</p>
        {user && (
          <p className="text-sm text-neutral-500 mt-2">
            Signed in as {user.email} ({user.groups.join(', ')})
          </p>
        )}
      </div>

      <div className="bg-white border border-neutral-200 rounded-lg p-6 sm:p-8 mt-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-neutral-900">My memberships</h2>
          <Link to="/clubs" className="text-sm font-medium text-neutral-700 hover:text-neutral-900">
            Browse clubs →
          </Link>
        </div>

        {memberships.loading ? (
          <p className="text-neutral-600">Loading…</p>
        ) : memberships.error ? (
          <p className="text-sm text-red-600">{memberships.error}</p>
        ) : !memberships.data?.length ? (
          <p className="text-neutral-600">You haven't joined any clubs yet.</p>
        ) : (
          <ul className="divide-y divide-neutral-200">
            {memberships.data.map((m) => (
              <li key={m.clubId} className="flex items-center justify-between py-3">
                <Link
                  to={`/clubs/${m.clubId}`}
                  className="text-sm font-medium text-neutral-900 hover:underline"
                >
                  {nameOf(m.clubId)}
                </Link>
                <div className="flex items-center gap-2">
                  {m.role === 'executive' && (
                    <span className="text-xs font-semibold tracking-wider text-neutral-500 uppercase">
                      Executive
                    </span>
                  )}
                  <StatusBadge status={m.status} />
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
