"use client";

import type { PlanTier } from "@/types";
import { useAuth } from "@/components/providers/auth-provider";

type PlanGateProps = {
  requiredTier: PlanTier | PlanTier[];
  children: React.ReactNode;
  fallback?: React.ReactNode;
};

function getTierRank(tier: PlanTier) {
  if (tier === "ENTERPRISE") return 3;
  if (tier === "PRO") return 2;
  return 1;
}

export function PlanGate({ requiredTier, children, fallback = null }: PlanGateProps) {
  const { subscription, loading } = useAuth();
  if (loading) return null;

  const currentTier = subscription?.plan.tier;
  if (!currentTier) return <>{fallback}</>;

  const required = Array.isArray(requiredTier) ? requiredTier : [requiredTier];
  const allowed = required.some((tier) => getTierRank(currentTier) >= getTierRank(tier));

  return allowed ? <>{children}</> : <>{fallback}</>;
}
