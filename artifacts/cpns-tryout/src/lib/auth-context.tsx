import React from 'react';
import { useUser, useClerk } from '@clerk/react';
import { useLocation } from 'wouter';

export interface User {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'participant';
  avatar: string;
  subscriptionId?: string | null;
  createdAt?: string;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  logout: () => Promise<void>;
  /** @deprecated Use Clerk's SignIn component instead */
  login: (email: string, pass: string) => Promise<void>;
}

const AuthContext = React.createContext<AuthContextType | undefined>(undefined);

function clerkUserToAppUser(clerkUser: ReturnType<typeof useUser>['user']): User | null {
  if (!clerkUser) return null;
  const email = clerkUser.primaryEmailAddress?.emailAddress ?? '';
  // Admin role check via public metadata (can be set in Auth pane)
  const role = (clerkUser.publicMetadata?.role as string) === 'admin' ? 'admin' : 'participant';
  return {
    id: clerkUser.id,
    name: clerkUser.fullName ?? clerkUser.firstName ?? email.split('@')[0] ?? 'Pengguna',
    email,
    role,
    avatar: clerkUser.firstName?.charAt(0).toUpperCase() ?? email.charAt(0).toUpperCase() ?? 'U',
    subscriptionId: (clerkUser.publicMetadata?.subscriptionId as string) ?? null,
  };
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { user: clerkUser, isLoaded } = useUser();
  const { signOut } = useClerk();
  const [, setLocation] = useLocation();

  const user = isLoaded ? clerkUserToAppUser(clerkUser) : null;
  const isLoading = !isLoaded;

  const logout = async () => {
    await signOut();
    setLocation('/');
  };

  // Legacy no-op — pages using this should migrate to Clerk SignIn component
  const login = async (_email: string, _pass: string) => {
    setLocation('/sign-in');
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
