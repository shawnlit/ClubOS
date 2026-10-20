import { useCallback } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { useLoad } from '../../hooks/useLoad';
import { getTicket } from '../../services/events';
import StatusBadge from '../ui/StatusBadge';

interface Props {
  clubId: string;
  eventId: string;
}

export default function TicketCard({ clubId, eventId }: Props) {
  const loader = useCallback(() => getTicket(clubId, eventId), [clubId, eventId]);
  const ticket = useLoad(loader);

  if (ticket.loading) return <p className="text-neutral-600">Loading ticket…</p>;
  if (ticket.error || !ticket.data) {
    return <p className="text-sm text-red-600">{ticket.error || 'Ticket not available'}</p>;
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-neutral-900">Your ticket</h2>
        <StatusBadge status={ticket.data.status} />
      </div>
      <div className="inline-block bg-white p-3 border border-neutral-200 rounded-md">
        <QRCodeSVG value={ticket.data.ticketId} size={176} />
      </div>
      <p className="text-sm text-neutral-600 mt-3">Show this QR code at the entrance.</p>
      <p className="text-xs text-neutral-500 mt-1 break-all">Ticket ID: {ticket.data.ticketId}</p>
    </div>
  );
}
