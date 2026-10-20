import { apiFetch } from './api';
import type {
  Attendance,
  CheckInResult,
  ClubEvent,
  NewEventInput,
  Registration,
  Ticket,
} from '../types';

function base(clubId: string, eventId?: string): string {
  const club = `/clubs/${encodeURIComponent(clubId)}/events`;
  return eventId ? `${club}/${encodeURIComponent(eventId)}` : club;
}

export async function listEvents(clubId: string): Promise<ClubEvent[]> {
  const data = await apiFetch<{ events: ClubEvent[] }>(base(clubId));
  return data.events;
}

export function getEvent(clubId: string, eventId: string): Promise<ClubEvent> {
  return apiFetch<ClubEvent>(base(clubId, eventId));
}

export function createEvent(clubId: string, input: NewEventInput): Promise<ClubEvent> {
  return apiFetch<ClubEvent>(base(clubId), { method: 'POST', body: input });
}

export function registerForEvent(clubId: string, eventId: string): Promise<Registration> {
  return apiFetch<Registration>(`${base(clubId, eventId)}/register`, { method: 'POST' });
}

export async function cancelRegistration(clubId: string, eventId: string): Promise<void> {
  await apiFetch<unknown>(`${base(clubId, eventId)}/register`, { method: 'DELETE' });
}

export async function listMyRegistrations(): Promise<Registration[]> {
  const data = await apiFetch<{ registrations: Registration[] }>('/me/registrations');
  return data.registrations;
}

export function getTicket(clubId: string, eventId: string): Promise<Ticket> {
  return apiFetch<Ticket>(`${base(clubId, eventId)}/ticket`);
}

export function checkIn(clubId: string, eventId: string, ticketId: string): Promise<CheckInResult> {
  return apiFetch<CheckInResult>(`${base(clubId, eventId)}/checkin`, {
    method: 'POST',
    body: { ticketId },
  });
}

export function getAttendance(clubId: string, eventId: string): Promise<Attendance> {
  return apiFetch<Attendance>(`${base(clubId, eventId)}/attendance`);
}
