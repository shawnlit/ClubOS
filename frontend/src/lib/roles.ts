import type { Me } from '../types';

export const ADMIN_GROUP = 'college_admin';

export function isAdmin(me: Me | null): boolean {
  return (me?.groups ?? []).includes(ADMIN_GROUP);
}