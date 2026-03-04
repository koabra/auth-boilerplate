import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import type { SubscriptionShape } from "@/types";

type SubscriptionStatusProps = {
  subscription: SubscriptionShape | null;
};

function formatDate(value: string | null) {
  if (!value) return "N/A";
  return new Date(value).toLocaleDateString();
}

export function SubscriptionStatusCard({ subscription }: SubscriptionStatusProps) {
  if (!subscription) {
    return (
      <Card className="space-y-2">
        <h3 className="text-lg font-semibold">No active subscription</h3>
        <p className="text-sm text-[var(--muted-foreground)]">Choose a plan to enable premium features.</p>
      </Card>
    );
  }

  return (
    <Card className="space-y-3">
      <div className="flex items-center gap-2">
        <h3 className="text-lg font-semibold">{subscription.plan.name}</h3>
        <Badge>{subscription.status}</Badge>
      </div>
      <p className="text-sm text-[var(--muted-foreground)]">
        Tier: {subscription.plan.tier} · Billing: {subscription.billingInterval}
      </p>
      <p className="text-sm text-[var(--muted-foreground)]">Current period ends: {formatDate(subscription.currentPeriodEnd)}</p>
      {subscription.trialEnd ? (
        <p className="text-sm text-[var(--muted-foreground)]">Trial ends: {formatDate(subscription.trialEnd)}</p>
      ) : null}
      {subscription.cancelAtPeriodEnd ? (
        <p className="text-sm text-amber-600 dark:text-amber-400">Cancels at period end.</p>
      ) : null}
    </Card>
  );
}
