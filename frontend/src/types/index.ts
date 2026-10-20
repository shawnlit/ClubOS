export interface Me {
  userId: string;
  email: string;
  groups: string[];
}

export interface Session {
  idToken: string;
  expiresAt: number;
}

export interface Club {
  clubId: string;
  name: string;
  description?: string;
  category?: string;
  status?: string;
  createdBy?: string;
  createdAt?: string;
}

export type MembershipRole = 'member' | 'executive';
export type MembershipStatus = 'pending' | 'approved' | 'rejected';

export interface Membership {
  clubId: string;
  userId?: string;
  email?: string;
  role: MembershipRole;
  status: MembershipStatus;
  requestedAt?: string;
  updatedAt?: string;
}

export interface ClubEvent {
  clubId: string;
  eventId: string;
  title: string;
  description?: string;
  venue: string;
  startsAt: string;
  registrationDeadline: string;
  capacity: number;
  registeredCount: number;
  spotsLeft: number;
  status: string;
}

export interface NewEventInput {
  title: string;
  description: string;
  venue: string;
  startsAt: string;
  registrationDeadline: string;
  capacity: number;
}

export type RegistrationStatus = 'registered' | 'checked_in';

export interface Registration {
  eventId: string;
  userId: string;
  clubId: string;
  email?: string;
  status: RegistrationStatus;
  ticketId?: string;
  registeredAt?: string;
  checkedInAt?: string;
}

export interface Ticket {
  ticketId: string;
  eventId: string;
  clubId: string;
  status: RegistrationStatus;
  checkedInAt?: string | null;
}

export interface AttendanceRow {
  userId: string;
  email: string;
  status: RegistrationStatus;
  registeredAt?: string;
  checkedInAt?: string | null;
}

export interface Attendance {
  eventId: string;
  total: number;
  checkedIn: number;
  attendees: AttendanceRow[];
}

export interface CheckInResult {
  message: string;
  userId: string;
  email: string;
  checkedInAt: string;
}

export interface Member {
  userId: string;
  email?: string;
  role: MembershipRole;
  status: MembershipStatus;
  requestedAt?: string;
  updatedAt?: string;
}