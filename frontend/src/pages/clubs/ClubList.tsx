import { Link } from 'react-router-dom';
import StatusBadge from '../../components/ui/StatusBadge';
import { useLoad } from '../../hooks/useLoad';
import { listClubs, listMyMemberships } from '../../services/clubs';

export default function ClubList() {
  const clubs = useLoad(listClubs);
  const memberships = useLoad(listMyMemberships);
  const statusOf = (clubId: string) =>
    memberships.data?.find((m) => m.clubId === clubId)?.status;

  return (
    <div>
      <div className="mb-6">
        <span className="text-xs font-semibold tracking-wider text-neutral-500 uppercase">Clubs</span>
        <h1 className="text-2xl font-bold text-neutral-900 mt-1">Browse clubs</h1>
      </div>

      {clubs.loading ? (
        <p className="text-neutral-600">Loading…</p>
      ) : clubs.error ? (
        <p className="text-sm text-red-600">{clubs.error}</p>
      ) : !clubs.data?.length ? (
        <p className="text-neutral-600">No clubs yet.</p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {clubs.data.map((club) => {
            const status = statusOf(club.clubId);
            return (
              <Link
                key={club.clubId}
                to={`/clubs/${club.clubId}`}
                className="block bg-white border border-neutral-200 rounded-lg p-5 hover:border-neutral-400 transition-colors"
              >
                <div className="flex items-start justify-between gap-2">
                  <h2 className="text-lg font-semibold text-neutral-900">{club.name}</h2>
                  {status && <StatusBadge status={status} />}
                </div>
                {club.category && (
                  <span className="text-xs font-semibold tracking-wider text-neutral-500 uppercase">
                    {club.category}
                  </span>
                )}
                {club.description && (
                  <p className="text-sm text-neutral-600 mt-2 line-clamp-3">{club.description}</p>
                )}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
