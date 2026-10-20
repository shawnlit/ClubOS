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