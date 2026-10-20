import { useCallback, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { useLoad } from '../../hooks/useLoad';
import { listMyMemberships } from '../../services/clubs';
import {
  cancelRegistration,
  getEvent,
  listMyRegistrations,
  registerForEvent,
} from '../../services/events';
import { formatDateTime } from '../../lib/format';
import { btnPrimary, btnSecondary, cardClass } from '../../lib/styles';
import StatusBadge from '../../components/ui/StatusBadge';
import TicketCard from '../../components/events/TicketCard';
import ManagePanel from '../../components/events/ManagePanel';

export default function EventDetail() {
  const { clubId = '', eventId = '' } = useParams();
  const { isAdmin } = useAuth();
  const loadEvent = useCallback(() => getEvent(clubId, eventId), [clubId, eventId]);
  const event = useLoad(loadEvent);
  const mine = useLoad(listMyMemberships);
  const regs = useLoad(listMyRegistrations);
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState('');

  const membership = mine.data?.find((m) => m.clubId === clubId) ?? null;
  const approved = membership?.status === 'approved';
  const canManage = isAdmin || (approved && membership?.role === 'executive');
  const registration = regs.data?.find((r) => r.eventId === eventId) ?? null;
  const ev = event.data;

  async function run(action: () => Promise<unknown>) {
    setActionError('');
    setBusy(true);
    try {
      await action();
      event.reload();
      regs.reload();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Action failed');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <Link
        to={`/clubs/${clubId}`}
        className="text-sm font-medium text-neutral-600 hover:text-neutral-900"
      >
        ← Back to club
      </Link>

      <div className={`${cardClass} mt-4`}>
        {event.loading ? (
          <p className="text-neutral-600">Loading…</p>
        ) : event.error || !ev ? (
          <p className="text-sm text-red-600">{event.error || 'Event not found'}</p>
        ) : (
          <>
            <span className="text-xs font-semibold tracking-wider text-neutral-500 uppercase">Event</span>
            <h1 className="text-2xl font-bold text-neutral-900 mt-1 mb-4">{ev.title}</h1>
            {ev.description && <p className="text-neutral-600 mb-4">{ev.description}</p>}
            <dl className="grid gap-3 text-sm sm:grid-cols-2 mb-6">
              <div>
                <dt className="text-neutral-500">Starts</dt>
                <dd className="text-neutral-900">{formatDateTime(ev.startsAt)}</dd>
              </div>
              <div>
                <dt className="text-neutral-500">Venue</dt>
                <dd className="text-neutral-900">{ev.venue}</dd>
              </div>
              <div>
                <dt className="text-neutral-500">Registration closes</dt>
                <dd className="text-neutral-900">{formatDateTime(ev.registrationDeadline)}</dd>
              </div>
              <div>
                <dt className="text-neutral-500">Spots</dt>
                <dd className="text-neutral-900">
                  {ev.spotsLeft} of {ev.capacity} left
                </dd>
              </div>
            </dl>

            {mine.loading || regs.loading ? null : registration ? (
              <div className="flex flex-wrap items-center gap-3">
                <StatusBadge status={registration.status} />
                <span className="text-sm text-neutral-600">
                  {registration.status === 'checked_in' ? 'You are checked in.' : "You're registered."}
                </span>
                {registration.status === 'registered' && (
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => run(() => cancelRegistration(clubId, eventId))}
                    className={btnSecondary}
                  >
                    Cancel registration
                  </button>
                )}
              </div>
            ) : approved ? (
              <button
                type="button"
                disabled={busy || ev.spotsLeft <= 0 || ev.status !== 'published'}
                onClick={() => run(() => registerForEvent(clubId, eventId))}
                className={btnPrimary}
              >
                {ev.spotsLeft <= 0 ? 'Event full' : 'Register'}
              </button>
            ) : (
              <p className="text-sm text-neutral-600">
                Only approved members of this club can register.{' '}
                {!isAdmin && (
                  <Link to={`/clubs/${clubId}`} className="underline">
                    Go to the club
                  </Link>
                )}
              </p>
            )}

            {actionError && <p className="text-sm text-red-600 mt-3">{actionError}</p>}
          </>
        )}
      </div>

      {registration && (
        <div className={`${cardClass} mt-6`}>
          <TicketCard key={registration.status} clubId={clubId} eventId={eventId} />
        </div>
      )}

      {ev && canManage && <ManagePanel clubId={clubId} eventId={eventId} />}
    </div>
  );
}
