"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { BillingMode, SubscriptionShape } from "@/types";

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
  subscription: SubscriptionShape | null;
  billingMode: BillingMode;
  loading: boolean;
  refresh: () => Promise<void>;
  hasRole: (role: string) => boolean;
  hasPermission: (resource: string, action: string) => boolean;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserShape | null>(null);
  const [subscription, setSubscription] = useState<SubscriptionShape | null>(null);
  const [billingMode, setBillingMode] = useState<BillingMode>("freemium");
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/auth/me", { cache: "no-store" });
      if (!response.ok) {
        setUser(null);
        setSubscription(null);
        return;
      }
      const data = (await response.json()) as { user: UserShape };
      setUser(data.user);

      const subscriptionResponse = await fetch("/api/billing/subscription", { cache: "no-store" });
      if (subscriptionResponse.ok) {
        const billingData = (await subscriptionResponse.json()) as {
          billingMode: BillingMode;
          subscription: SubscriptionShape | null;
        };
        setBillingMode(billingData.billingMode);
        setSubscription(billingData.subscription);
      } else {
        setSubscription(null);
      }
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
      subscription,
      billingMode,
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
    [billingMode, loading, refresh, subscription, user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used inside AuthProvider");
  return context;
}
