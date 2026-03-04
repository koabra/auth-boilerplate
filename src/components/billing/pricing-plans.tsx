"use client";

import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import type { BillingInterval, BillingMode, PlanShape } from "@/types";

type PricingPlansProps = {
  plans: PlanShape[];
  billingMode: BillingMode;
  processingPlanId?: string | null;
  onCheckout: (planId: string, interval: BillingInterval) => Promise<void>;
};

function formatCurrency(amount: number, currency: string) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency.toUpperCase(),
    maximumFractionDigits: 0,
  }).format(amount / 100);
}

export function PricingPlans({ plans, billingMode, processingPlanId = null, onCheckout }: PricingPlansProps) {
  const [interval, setInterval] = useState<BillingInterval>("MONTHLY");

  const normalizedPlans = useMemo(
    () =>
      plans.map((plan) => {
        const match = plan.prices.find((price) => price.interval === interval) ?? plan.prices[0];
        return { ...plan, selectedPrice: match };
      }),
    [interval, plans],
  );

  return (
    <div className="space-y-6">
      <div className="inline-flex rounded-lg border border-[var(--border)] bg-[var(--surface)] p-1">
        <button
          className={
            interval === "MONTHLY"
              ? "rounded-md bg-[var(--accent)] px-4 py-1.5 text-sm font-medium text-[var(--accent-foreground)]"
              : "rounded-md px-4 py-1.5 text-sm text-[var(--muted-foreground)] hover:bg-[var(--surface-2)]"
          }
          onClick={() => setInterval("MONTHLY")}
          type="button"
        >
          Monthly
        </button>
        <button
          className={
            interval === "YEARLY"
              ? "rounded-md bg-[var(--accent)] px-4 py-1.5 text-sm font-medium text-[var(--accent-foreground)]"
              : "rounded-md px-4 py-1.5 text-sm text-[var(--muted-foreground)] hover:bg-[var(--surface-2)]"
          }
          onClick={() => setInterval("YEARLY")}
          type="button"
        >
          Yearly
        </button>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {normalizedPlans.map((plan) => {
          const amountText = plan.selectedPrice
            ? formatCurrency(plan.selectedPrice.amount, plan.selectedPrice.currency)
            : "Unavailable";
          const ctaLabel =
            plan.tier === "FREE" ? "Start Free" : billingMode === "trial" ? "Start 7-Day Trial" : "Get Started";
          const isLoading = processingPlanId === plan.id;
          return (
            <Card className="space-y-4" key={plan.id}>
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-semibold">{plan.name}</h3>
                <Badge>{plan.tier}</Badge>
              </div>
              <p className="text-sm text-[var(--muted-foreground)]">{plan.description}</p>
              <div>
                <p className="text-3xl font-bold">{amountText}</p>
                <p className="text-xs text-[var(--muted-foreground)]">per {interval === "MONTHLY" ? "month" : "year"}</p>
              </div>
              <ul className="space-y-1 text-sm text-[var(--muted-foreground)]">
                {plan.features.map((feature) => (
                  <li key={feature}>- {feature}</li>
                ))}
              </ul>
              <Button
                className="w-full"
                disabled={isLoading || !plan.selectedPrice}
                onClick={() => onCheckout(plan.id, interval)}
                data-track={`pricing.checkout.${plan.tier.toLowerCase()}`}
              >
                {isLoading ? "Processing..." : ctaLabel}
              </Button>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
