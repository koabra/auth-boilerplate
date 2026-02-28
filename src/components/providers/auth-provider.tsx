"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

type UserShape = {
  id: string;
  email: string;
  pseudonym: string;
  displayName: string | null;
  roles: string[];
  permissions: Array<{ resource: string; action: string }>;
};

type AuthContextValue = {
  user: UserShape | null;
  loading: boolean;
  refresh: () => Promise<void>;
  hasRole: (role: string) => boolean;
  hasPermission: (resource: string, action: string) => boolean;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserShape | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/auth/me", { cache: "no-store" });
      if (!response.ok) {
        setUser(null);
        return;
      }
      const data = (await response.json()) as { user: UserShape };
      setUser(data.user);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      loading,
      refresh,
      hasRole: (role) => user?.roles.includes(role) ?? false,
      hasPermission: (resource, action) => {
        if (!user) return false;
        if (user.roles.includes("super_user")) return true;
        return user.permissions.some(
          (permission) =>
            permission.resource === resource &&
            (permission.action === action || permission.action === "manage"),
        );
      },
    }),
    [loading, refresh, user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used inside AuthProvider");
  return context;
}
