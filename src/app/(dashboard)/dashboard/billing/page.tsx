"use client";

import { useEffect, useState } from "react";
import { PricingPlans } from "@/components/billing/pricing-plans";
import { SubscriptionStatusCard } from "@/components/billing/subscription-status";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useAuth } from "@/components/providers/auth-provider";
import type { BillingInterval, BillingMode, PlanShape, SubscriptionShape } from "@/types";

type SubscriptionResponse = {
  billingMode: BillingMode;
  subscription: SubscriptionShape | null;
};

type PlansResponse = {
  plans: PlanShape[];
};

export default function BillingPage() {
  const { refresh } = useAuth();
  const [subscription, setSubscription] = useState<SubscriptionShape | null>(null);
  const [plans, setPlans] = useState<PlanShape[]>([]);
  const [billingMode, setBillingMode] = useState<BillingMode>("freemium");
  const [loading, setLoading] = useState(true);
  const [processingPlanId, setProcessingPlanId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const [subscriptionResponse, plansResponse] = await Promise.all([
        fetch("/api/billing/subscription", { cache: "no-store" }),
        fetch("/api/billing/plans", { cache: "no-store" }),
      ]);

      if (subscriptionResponse.ok) {
        const subData = (await subscriptionResponse.json()) as SubscriptionResponse;
        setSubscription(subData.subscription);
        setBillingMode(subData.billingMode);
      }

      if (plansResponse.ok) {
        const plansData = (await plansResponse.json()) as PlansResponse;
        setPlans(plansData.plans);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const startCheckout = async (planId: string, interval: BillingInterval) => {
    setError(null);
    setProcessingPlanId(planId);
    try {
      const response = await fetch("/api/billing/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planId, interval }),
      });
      const data = (await response.json()) as { checkoutUrl?: string; error?: string };
      if (!response.ok || !data.checkoutUrl) {
        throw new Error(data.error ?? "Could not start checkout");
      }
      window.location.href = data.checkoutUrl;
    } catch (checkoutError) {
      setError(checkoutError instanceof Error ? checkoutError.message : "Could not start checkout");
    } finally {
      setProcessingPlanId(null);
    }
  };

  const openPortal = async () => {
    setError(null);
    const response = await fetch("/api/billing/portal", { method: "POST" });
    const data = (await response.json()) as { portalUrl?: string; error?: string };
    if (!response.ok || !data.portalUrl) {
      setError(data.error ?? "Could not open billing portal");
      return;
    }
    window.location.href = data.portalUrl;
  };

  const updateSubscription = async (action: "cancel" | "resume") => {
    setError(null);
    const response = await fetch("/api/billing/subscription", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    });
    const data = (await response.json()) as { error?: string };
    if (!response.ok) {
      setError(data.error ?? "Could not update subscription");
      return;
    }
    await load();
    await refresh();
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold">Billing</h2>
        <p className="text-sm text-[var(--muted-foreground)]">Manage your plan and subscription lifecycle.</p>
      </div>

      {loading ? <p className="text-sm text-[var(--muted-foreground)]">Loading billing information...</p> : null}
      {error ? <p className="text-sm text-red-500">{error}</p> : null}

      {!loading ? <SubscriptionStatusCard subscription={subscription} /> : null}

      {!loading && subscription ? (
        <Card className="flex flex-wrap gap-2">
          <Button onClick={openPortal} variant="outline" data-track="billing.open_portal">
            Manage in Stripe Portal
          </Button>
          {subscription.cancelAtPeriodEnd ? (
            <Button onClick={() => updateSubscription("resume")} variant="secondary" data-track="billing.resume">
              Resume Subscription
            </Button>
          ) : (
            <Button onClick={() => updateSubscription("cancel")} variant="outline" data-track="billing.cancel">
              Cancel at Period End
            </Button>
          )}
        </Card>
      ) : null}

      {!loading ? (
        <div className="space-y-2">
          <h3 className="text-lg font-semibold">Change Plan</h3>
          <p className="text-sm text-[var(--muted-foreground)]">Billing mode: {billingMode}</p>
          <PricingPlans
            billingMode={billingMode}
            plans={plans}
            processingPlanId={processingPlanId}
            onCheckout={startCheckout}
          />
        </div>
      ) : null}
    </div>
  );
}
