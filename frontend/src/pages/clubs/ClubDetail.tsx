import { useCallback, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { useLoad } from '../../hooks/useLoad';
import { deleteClub, getClub, joinClub, listMyMemberships } from '../../services/clubs';
import StatusBadge from '../../components/ui/StatusBadge';
import EventsSection from '../../components/events/EventsSection';
import MembersPanel from '../../components/clubs/MembersPanel';
import { btnPrimary, cardClass } from '../../lib/styles';

export default function ClubDetail() {
  const { clubId = '' } = useParams();
  const navigate = useNavigate();
  const { isAdmin } = useAuth();
  const loadClub = useCallback(() => getClub(clubId), [clubId]);
  const club = useLoad(loadClub);
  const mine = useLoad(listMyMemberships);
  const [joining, setJoining] = useState(false);
  const [joinError, setJoinError] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  const membership = mine.data?.find((m) => m.clubId === clubId) ?? null;
  const canManage = isAdmin || (membership?.status === 'approved' && membership.role === 'executive');

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

  async function handleDelete() {
    if (!club.data || !window.confirm(`Delete "${club.data.name}"? This will hide the club from ClubOS.`)) {
      return;
    }

    setDeleteError('');
    setDeleting(true);
    try {
      await deleteClub(clubId);
      navigate('/clubs', { replace: true });
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : 'Could not delete club');
      setDeleting(false);
    }
  }

  return (
    <div>
      <Link to="/clubs" className="text-sm font-medium text-neutral-600 hover:text-neutral-900">
        ← All clubs
      </Link>

      <div className={`${cardClass} mt-4`}>
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

            {isAdmin && (
              <div className="flex flex-wrap items-center gap-3">
                {!membership && (
                  <p className="text-sm text-neutral-600">You manage all clubs as a college admin.</p>
                )}
                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={deleting}
                  className="px-4 py-2 bg-red-600 text-white rounded-md text-sm font-medium hover:bg-red-700 transition-colors disabled:opacity-60"
                >
                  {deleting ? 'Deleting…' : 'Delete club'}
                </button>
              </div>
            )}

            {!isAdmin && !mine.loading && !membership && (
              <button type="button" onClick={handleJoin} disabled={joining} className={btnPrimary}>
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
            {deleteError && <p className="text-sm text-red-600 mt-3">{deleteError}</p>}
          </>
        )}
      </div>

      {club.data && <EventsSection clubId={clubId} canManage={canManage} />}
      {club.data && canManage && <MembersPanel clubId={clubId} isAdmin={isAdmin} />}
    </div>
  );
}
