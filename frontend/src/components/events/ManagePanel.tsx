import { useCallback, useState } from 'react';
import type { FormEvent } from 'react';
import { useLoad } from '../../hooks/useLoad';
import { checkIn, getAttendance } from '../../services/events';
import { formatDateTime } from '../../lib/format';
import { btnPrimary, cardClass, inputClass, labelClass } from '../../lib/styles';
import StatusBadge from '../ui/StatusBadge';

interface Props {
  clubId: string;
  eventId: string;
}

export default function ManagePanel({ clubId, eventId }: Props) {
  const loader = useCallback(() => getAttendance(clubId, eventId), [clubId, eventId]);
  const attendance = useLoad(loader);
  const [ticketId, setTicketId] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  async function handleCheckIn(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError('');
    setMessage('');
    setBusy(true);
    try {
      const result = await checkIn(clubId, eventId, ticketId.trim());
      setMessage(`Checked in ${result.email || result.userId}`);
      setTicketId('');
      attendance.reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Check-in failed');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className={`${cardClass} mt-6`}>
      <h2 className="text-lg font-semibold text-neutral-900 mb-4">Check-in</h2>
      <form onSubmit={handleCheckIn} className="flex flex-col sm:flex-row gap-3 sm:items-end">
        <div className="flex-1">
          <label htmlFor="ticketId" className={labelClass}>
            Ticket ID
          </label>
          <input
            id="ticketId"
            value={ticketId}
            onChange={(e) => setTicketId(e.target.value)}
            placeholder="Paste the ticket ID from the attendee's QR"
            required
            className={inputClass}
          />
        </div>
        <button type="submit" disabled={busy} className={btnPrimary}>
          {busy ? 'Checking in…' : 'Check in'}
        </button>
      </form>
      {message && <p className="text-sm text-green-700 mt-3">{message}</p>}
      {error && <p className="text-sm text-red-600 mt-3">{error}</p>}

      <h3 className="text-sm font-semibold text-neutral-900 mt-8 mb-3">
        Attendance
        {attendance.data && ` (${attendance.data.checkedIn} of ${attendance.data.total} checked in)`}
      </h3>
      {attendance.loading ? (
        <p className="text-neutral-600">Loading…</p>
      ) : attendance.error ? (
        <p className="text-sm text-red-600">{attendance.error}</p>
      ) : !attendance.data?.attendees.length ? (
        <p className="text-neutral-600">No registrations yet.</p>
      ) : (
        <ul className="divide-y divide-neutral-200">
          {attendance.data.attendees.map((a) => (
            <li key={a.userId} className="flex items-center justify-between py-3">
              <span className="text-sm text-neutral-900">{a.email || a.userId}</span>
              <div className="flex items-center gap-3">
                {a.checkedInAt && (
                  <span className="text-xs text-neutral-500">{formatDateTime(a.checkedInAt)}</span>
                )}
                <StatusBadge status={a.status} />
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
