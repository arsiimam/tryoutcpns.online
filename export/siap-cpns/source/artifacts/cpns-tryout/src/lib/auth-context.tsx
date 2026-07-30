// @refresh reset
import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { useLocation } from "wouter";

export interface UserSubscription {
  planId: string;
  planName: string;
  status: string;
  expiresAt: string;
  daysLeft: number;
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: "admin" | "participant";
  avatar: string;
  avatarUrl?: string | null;
  subscriptionId?: string | null;
  subscription?: UserSubscription | null;
  createdAt?: string;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refetch: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function apiUserToAppUser(u: {
  id: string;
  fullName: string;
  email: string;
  role: string;
  avatarUrl?: string | null;
  subscription?: UserSubscription | null;
}): User {
  return {
    id: u.id,
    name: u.fullName,
    email: u.email,
    role: (u.role === "admin" ? "admin" : "participant") as "admin" | "participant",
    avatar: u.fullName?.charAt(0)?.toUpperCase() ?? u.email.charAt(0).toUpperCase() ?? "U",
    avatarUrl: u.avatarUrl ?? null,
    subscriptionId: u.subscription?.planId ?? null,
    subscription: u.subscription ?? null,
  };
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [, setLocation] = useLocation();

  const fetchMe = useCallback(async () => {
    try {
      const res = await fetch("/api/auth/me", { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        setUser(apiUserToAppUser(data.user));
      } else {
        setUser(null);
      }
    } catch {
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMe();
  }, [fetchMe]);

  const login = async (email: string, password: string) => {
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ email, password }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error((data as { error?: string }).error ?? "Login gagal.");
    }
    const data = await res.json();
    setUser(apiUserToAppUser(data.user));
  };

  const logout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
    } catch {
      // ignore
    }
    setUser(null);
    setLocation("/");
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, login, logout, refetch: fetchMe }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
