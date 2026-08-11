import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { setMemoryAuth, clearAuth, loadStoredAuth, api } from '../api/client';
import type { User } from '../types/domain';

interface AuthContextValue {
  user: User | null;
  setAuth: (data: { accessToken: string; refreshToken: string; user: User }) => void;
  logout: () => void;
  loading: boolean;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const stored = loadStoredAuth();
    if (!stored) {
      setLoading(false);
      return;
    }
    api
      .get('/auth/me')
      .then((res) => setUser(res.data))
      .catch(() => clearAuth())
      .finally(() => setLoading(false));
  }, []);

  const setAuth = (data: { accessToken: string; refreshToken: string; user: User }) => {
    setMemoryAuth(data);
    setUser(data.user);
  };

  const logout = () => {
    clearAuth();
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, setAuth, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}