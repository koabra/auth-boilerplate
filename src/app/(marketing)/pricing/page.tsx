"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { PricingPlans } from "@/components/billing/pricing-plans";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useAuth } from "@/components/providers/auth-provider";
import type { BillingInterval, BillingMode, PlanShape } from "@/types";

type PlansResponse = {
  billingMode: BillingMode;
  plans: PlanShape[];
};

export default function PricingPage() {
  const { user } = useAuth();
  const [plans, setPlans] = useState<PlanShape[]>([]);
  const [billingMode, setBillingMode] = useState<BillingMode>("freemium");
  const [loading, setLoading] = useState(true);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  const [processingPlanId, setProcessingPlanId] = useState<string | null>(null);

  useEffect(() => {
    const loadPlans = async () => {
      setLoading(true);
      try {
        const response = await fetch("/api/billing/plans", { cache: "no-store" });
        if (!response.ok) return;
        const data = (await response.json()) as PlansResponse;
        setPlans(data.plans);
        setBillingMode(data.billingMode);
      } finally {
        setLoading(false);
      }
    };
    void loadPlans();
  }, []);

  const handleCheckout = async (planId: string, interval: BillingInterval) => {
    if (!user) {
      window.location.href = "/login";
      return;
    }

    setCheckoutError(null);
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
    } catch (error) {
      setCheckoutError(error instanceof Error ? error.message : "Could not start checkout");
    } finally {
      setProcessingPlanId(null);
    }
  };

  return (
    <main className="mx-auto min-h-screen max-w-6xl space-y-6 px-6 py-12">
      <Card className="space-y-2">
        <h1 className="text-3xl font-bold">Pricing</h1>
        <p className="text-sm text-[var(--muted-foreground)]">
          Choose the right plan for your app. Mode: <span className="font-medium uppercase">{billingMode}</span>
        </p>
        <div className="flex gap-2 pt-2">
          <Link href="/dashboard">
            <Button variant="outline">Go to Dashboard</Button>
          </Link>
          {!user ? (
            <Link href="/register">
              <Button>Register</Button>
            </Link>
          ) : null}
        </div>
      </Card>

      {loading ? <p className="text-sm text-[var(--muted-foreground)]">Loading plans...</p> : null}
      {checkoutError ? <p className="text-sm text-red-500">{checkoutError}</p> : null}
      {!loading ? (
        <PricingPlans
          billingMode={billingMode}
          plans={plans}
          processingPlanId={processingPlanId}
          onCheckout={handleCheckout}
        />
      ) : null}
    </main>
  );
}
