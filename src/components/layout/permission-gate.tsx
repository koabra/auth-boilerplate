"use client";

import { useAuth } from "@/components/providers/auth-provider";

type PermissionGateProps = {
  resource: string;
  action: string;
  children: React.ReactNode;
  fallback?: React.ReactNode;
};

export function PermissionGate({ resource, action, children, fallback = null }: PermissionGateProps) {
  const { hasPermission, loading } = useAuth();
  if (loading) return null;
  return hasPermission(resource, action) ? <>{children}</> : <>{fallback}</>;
}
