import { useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useLoad } from '../../hooks/useLoad';
import { getEvent } from '../../services/events';
import { formatDateTime } from '../../lib/format';
import StatusBadge from '../ui/StatusBadge';
import type { Registration } from '../../types';

export default function RegistrationRow({ registration }: { registration: Registration }) {
  const { clubId, eventId } = registration;
  const loader = useCallback(() => getEvent(clubId, eventId), [clubId, eventId]);
  const event = useLoad(loader);

  return (
    <li className="flex items-center justify-between py-3">
      <Link
        to={`/clubs/${clubId}/events/${eventId}`}
        className="text-sm font-medium text-neutral-900 hover:underline"
      >
        {event.data?.title ?? 'Event'}
      </Link>
      <div className="flex items-center gap-3">
        {event.data && (
          <span className="text-xs text-neutral-500">{formatDateTime(event.data.startsAt)}</span>
        )}
        <StatusBadge status={registration.status} />
      </div>
    </li>
  );
}
