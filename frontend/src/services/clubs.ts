import { apiFetch } from './api';
import type {
  Club,
  Member,
  Membership,
  MembershipRole,
  MembershipStatus,
} from '../types';

interface ClubApi {
  clubId: string;
  name: string;
  description?: string;
  category?: string;
  status?: string;
  createdBy?: string;
  createdAt?: string;
}

interface MembershipApi {
  clubId: string;
  userId?: string;
  email?: string;
  role: 'member' | 'executive';
  status: 'pending' | 'approved' | 'rejected';
  requestedAt?: string;
  updatedAt?: string;
}

export async function listClubs(): Promise<Club[]> {
  const payload = await apiFetch<{ clubs: ClubApi[] }>('/clubs');
  return payload.clubs.map((club) => ({
    clubId: club.clubId,
    name: club.name,
    description: club.description,
    category: club.category,
    status: club.status,
    createdBy: club.createdBy,
    createdAt: club.createdAt,
  }));
}

export async function getClub(clubId: string): Promise<Club> {
  const club = await apiFetch<ClubApi>(`/clubs/${encodeURIComponent(clubId)}`);
  return {
    clubId: club.clubId,
    name: club.name,
    description: club.description,
    category: club.category,
    status: club.status,
    createdBy: club.createdBy,
    createdAt: club.createdAt,
  };
}

export async function listMyMemberships(): Promise<Membership[]> {
  const payload = await apiFetch<{ memberships: MembershipApi[] }>('/me/memberships');
  return payload.memberships.map((membership) => ({
    clubId: membership.clubId,
    userId: membership.userId,
    email: membership.email,
    role: membership.role,
    status: membership.status,
    requestedAt: membership.requestedAt,
    updatedAt: membership.updatedAt,
  }));
}

export async function joinClub(clubId: string): Promise<void> {
  await apiFetch<unknown>(`/clubs/${encodeURIComponent(clubId)}/join`, { method: 'POST' });
}

export async function createClub(input: {
  name: string;
  description: string;
  category: string;
}): Promise<void> {
  await apiFetch<unknown>('/clubs', { method: 'POST', body: input });
}

export async function deleteClub(clubId: string): Promise<void> {
  await apiFetch<unknown>(`/clubs/${encodeURIComponent(clubId)}`, { method: 'DELETE' });
}

export async function listMembers(clubId: string, status: MembershipStatus): Promise<Member[]> {
  const data = await apiFetch<{ members: Member[] }>(
    `/clubs/${encodeURIComponent(clubId)}/members?status=${encodeURIComponent(status)}`,
  );
  return data.members;
}

export async function updateMember(
  clubId: string,
  userId: string,
  body: { status?: MembershipStatus; role?: MembershipRole },
): Promise<void> {
  await apiFetch<unknown>(
    `/clubs/${encodeURIComponent(clubId)}/members/${encodeURIComponent(userId)}`,
    { method: 'PATCH', body },
  );
}
