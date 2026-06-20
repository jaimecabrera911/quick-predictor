import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react';
import type { User } from '@/db/types';
import { useRepository } from '@/db/context';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, name: string) => Promise<void>;
  signOut: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const repo = useRepository();

  useEffect(() => {
    repo.getSession().then((u) => {
      if (u) setUser(u);
    }).finally(() => setLoading(false));
  }, [repo]);

  const signIn = useCallback(async (email: string, password: string) => {
    setLoading(true);
    try {
      const u = await repo.signIn(email, password);
      setUser(u);
    } finally {
      setLoading(false);
    }
  }, [repo]);

  const signUp = useCallback(async (email: string, password: string, name: string) => {
    setLoading(true);
    try {
      const u = await repo.signUp(email, password, name);
      setUser(u);
    } finally {
      setLoading(false);
    }
  }, [repo]);

  const signOut = useCallback(() => {
    setUser(null);
    repo.signOut();
  }, [repo]);

  return (
    <AuthContext.Provider value={{ user, loading, signIn, signUp, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
