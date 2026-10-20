import { useState } from 'react';
import type { FormEvent } from 'react';
import { createEvent } from '../../services/events';
import { btnPrimary, btnSecondary, inputClass, labelClass } from '../../lib/styles';

interface Props {
  clubId: string;
  onCreated: () => void;
}

function toIso(local: string): string | null {
  const date = new Date(local);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

export default function CreateEventForm({ clubId, onCreated }: Props) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [venue, setVenue] = useState('');
  const [description, setDescription] = useState('');
  const [startsAt, setStartsAt] = useState('');
  const [deadline, setDeadline] = useState('');
  const [capacity, setCapacity] = useState('20');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError('');
    const startIso = toIso(startsAt);
    const deadlineIso = toIso(deadline);
    const cap = Number(capacity);
    if (!startIso || !deadlineIso) {
      setError('Enter a valid start time and registration deadline');
      return;
    }
    if (new Date(deadlineIso).getTime() > new Date(startIso).getTime()) {
      setError('Registration deadline must not be after the start time');
      return;
    }
    if (!Number.isInteger(cap) || cap < 1) {
      setError('Capacity must be a whole number of at least 1');
      return;
    }
    setBusy(true);
    try {
      await createEvent(clubId, {
        title: title.trim(),
        description: description.trim(),
        venue: venue.trim(),
        startsAt: startIso,
        registrationDeadline: deadlineIso,
        capacity: cap,
      });
      setTitle('');
      setVenue('');
      setDescription('');
      setStartsAt('');
      setDeadline('');
      setCapacity('20');
      setOpen(false);
      onCreated();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not create event');
    } finally {
      setBusy(false);
    }
  }

  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className={btnSecondary}>
        Create event
      </button>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 border border-neutral-200 rounded-md p-4">
      <div>
        <label htmlFor="ev-title" className={labelClass}>Title</label>
        <input id="ev-title" value={title} onChange={(e) => setTitle(e.target.value)} required className={inputClass} />
      </div>
      <div>
        <label htmlFor="ev-venue" className={labelClass}>Venue</label>
        <input id="ev-venue" value={venue} onChange={(e) => setVenue(e.target.value)} required className={inputClass} />
      </div>
      <div>
        <label htmlFor="ev-desc" className={labelClass}>Description</label>
        <textarea id="ev-desc" value={description} onChange={(e) => setDescription(e.target.value)} rows={3} className={inputClass} />
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        <div>
          <label htmlFor="ev-start" className={labelClass}>Starts</label>
          <input id="ev-start" type="datetime-local" value={startsAt} onChange={(e) => setStartsAt(e.target.value)} required className={inputClass} />
        </div>
        <div>
          <label htmlFor="ev-deadline" className={labelClass}>Registration closes</label>
          <input id="ev-deadline" type="datetime-local" value={deadline} onChange={(e) => setDeadline(e.target.value)} required className={inputClass} />
        </div>
        <div>
          <label htmlFor="ev-cap" className={labelClass}>Capacity</label>
          <input id="ev-cap" type="number" min={1} value={capacity} onChange={(e) => setCapacity(e.target.value)} required className={inputClass} />
        </div>
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <div className="flex gap-3">
        <button type="submit" disabled={busy} className={btnPrimary}>
          {busy ? 'Creating…' : 'Create'}
        </button>
        <button type="button" onClick={() => setOpen(false)} className={btnSecondary}>
          Cancel
        </button>
      </div>
    </form>
  );
}
