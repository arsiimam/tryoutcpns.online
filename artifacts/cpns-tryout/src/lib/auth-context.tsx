import React from 'react';
import { useLocation } from 'wouter';
import { User, dummyApi } from './dummy-api';
import { users } from '../data/dummy-cpns-data';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (email: string, pass: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = React.createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = React.useState<User | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [, setLocation] = useLocation();

  React.useEffect(() => {
    const init = async () => {
      try {
        const stored = localStorage.getItem('cpns_user');
        if (stored) {
          const parsed = JSON.parse(stored);
          setUser(parsed);
        } else {
          // Auto-login with demo participant user for demo purposes
          const demoUser = users[1]; // Budi Santoso - Gold subscriber
          setUser(demoUser);
          localStorage.setItem('cpns_user', JSON.stringify(demoUser));
        }
      } catch (e) {
        const demoUser = users[1];
        setUser(demoUser);
      } finally {
        setIsLoading(false);
      }
    };
    init();
  }, []);

  const login = async (email: string, pass: string) => {
    setIsLoading(true);
    try {
      const u = await dummyApi.login(email, pass);
      setUser(u);
      localStorage.setItem('cpns_user', JSON.stringify(u));
      if (u.role === 'admin') {
        setLocation('/admin/dashboard');
      } else {
        setLocation('/dashboard');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    await dummyApi.logout();
    setUser(null);
    localStorage.removeItem('cpns_user');
    setLocation('/login');
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = React.useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
