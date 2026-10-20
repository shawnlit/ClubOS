import { useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useLoad } from '../../hooks/useLoad';
import { listEvents } from '../../services/events';
import { formatDateTime } from '../../lib/format';
import { cardClass } from '../../lib/styles';
import CreateEventForm from './CreateEventForm';

interface Props {
  clubId: string;
  canManage: boolean;
}

export default function EventsSection({ clubId, canManage }: Props) {
  const loader = useCallback(() => listEvents(clubId), [clubId]);
  const events = useLoad(loader);

  return (
    <div className={`${cardClass} mt-6`}>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-neutral-900">Events</h2>
      </div>

      {canManage && (
        <div className="mb-4">
          <CreateEventForm clubId={clubId} onCreated={events.reload} />
        </div>
      )}

      {events.loading ? (
        <p className="text-neutral-600">Loading…</p>
      ) : events.error ? (
        <p className="text-sm text-red-600">{events.error}</p>
      ) : !events.data?.length ? (
        <p className="text-neutral-600">No events yet.</p>
      ) : (
        <ul className="divide-y divide-neutral-200">
          {events.data.map((ev) => (
            <li key={ev.eventId} className="py-3">
              <Link to={`/clubs/${clubId}/events/${ev.eventId}`} className="block hover:underline">
                <span className="text-sm font-medium text-neutral-900">{ev.title}</span>
              </Link>
              <p className="text-xs text-neutral-500 mt-1">
                {formatDateTime(ev.startsAt)} · {ev.venue} · {ev.spotsLeft} of {ev.capacity} spots left
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
