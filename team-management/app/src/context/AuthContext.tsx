import { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import { login, type User } from '../api/client';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (username: string, password: string) => Promise<boolean>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const saved = localStorage.getItem('tm_user');
    if (saved) {
      try {
        setUser(JSON.parse(saved));
      } catch (e) {}
    }
    setLoading(false);
  }, []);

  const loginFn = async (username: string, password: string): Promise<boolean> => {
    try {
      const u = await login(username, password);
      if (u) {
        setUser(u);
        localStorage.setItem('tm_user', JSON.stringify(u));
        return true;
      }
      return false;
    } catch (e) {
      return false;
    }
  };

  const logoutFn = () => {
    setUser(null);
    localStorage.removeItem('tm_user');
  };

  return (
    <AuthContext.Provider value={{ user, loading, login: loginFn, logout: logoutFn }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

export function useIsAdmin(): boolean {
  const { user } = useAuth();
  return user?.role === 'admin';
}
