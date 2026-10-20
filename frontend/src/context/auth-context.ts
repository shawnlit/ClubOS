import { createContext } from 'react';
import type { Me } from '../types';

export interface AuthContextValue {
  user: Me | null;
  isAdmin: boolean;
  loading: boolean;
  login: (email: string, password: string) => Promise<Me>;
  logout: () => void;
}

export const AuthContext = createContext<AuthContextValue | null>(null);