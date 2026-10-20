import { useCallback, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import StatusBadge from '../../components/ui/StatusBadge';
import { useLoad } from '../../hooks/useLoad';
import { getClub, joinClub, listMyMemberships } from '../../services/clubs';

export default function ClubDetail() {
  const { clubId = '' } = useParams();
  const loadClub = useCallback(() => getClub(clubId), [clubId]);
  const club = useLoad(loadClub);
  const mine = useLoad(listMyMemberships);
  const [joining, setJoining] = useState(false);
  const [joinError, setJoinError] = useState('');

  const membership = mine.data?.find((m) => m.clubId === clubId) ?? null;

  async function handleJoin() {
    setJoinError('');
    setJoining(true);
    try {
      await joinClub(clubId);
      mine.reload();
    } catch (err) {
      setJoinError(err instanceof Error ? err.message : 'Could not send request');
    } finally {
      setJoining(false);
    }
  }

  return (
    <div>
      <Link to="/clubs" className="text-sm font-medium text-neutral-600 hover:text-neutral-900">
        ← All clubs
      </Link>

      <div className="bg-white border border-neutral-200 rounded-lg p-6 sm:p-8 mt-4">
        {club.loading ? (
          <p className="text-neutral-600">Loading…</p>
        ) : club.error || !club.data ? (
          <p className="text-sm text-red-600">{club.error || 'Club not found'}</p>
        ) : (
          <>
            <span className="text-xs font-semibold tracking-wider text-neutral-500 uppercase">
              {club.data.category ?? 'Club'}
            </span>
            <h1 className="text-2xl font-bold text-neutral-900 mt-1 mb-4">{club.data.name}</h1>
            {club.data.description && <p className="text-neutral-600 mb-6">{club.data.description}</p>}

            {!mine.loading && !membership && (
              <button
                type="button"
                onClick={handleJoin}
                disabled={joining}
                className="px-5 py-2.5 bg-neutral-900 text-white rounded-md text-sm font-medium hover:bg-neutral-800 transition-colors disabled:opacity-60"
              >
                {joining ? 'Sending…' : 'Request to join'}
              </button>
            )}

            {membership && (
              <div className="flex items-center gap-2">
                <StatusBadge status={membership.status} />
                <span className="text-sm text-neutral-600">
                  {membership.status === 'pending' && 'Your request is waiting for approval.'}
                  {membership.status === 'approved' &&
                    (membership.role === 'executive'
                      ? 'You are an executive of this club.'
                      : 'You are a member of this club.')}
                  {membership.status === 'rejected' && 'Your request was rejected.'}
                </span>
              </div>
            )}

            {joinError && <p className="text-sm text-red-600 mt-3">{joinError}</p>}
          </>
        )}
      </div>
    </div>
  );
}
