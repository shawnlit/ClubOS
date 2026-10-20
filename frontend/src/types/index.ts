export interface Me {
  userId: string;
  email: string;
  groups: string[];
}

export interface Session {
  idToken: string;
  expiresAt: number;
}