export type AppRole = "super_user" | "admin" | "user" | string;

export type AppPermission = {
  resource: string;
  action: string;
};

export type SessionPayload = {
  userId: string;
  email: string;
  roles: AppRole[];
};

export type BillingMode = "freemium" | "trial";

export type PlanTier = "FREE" | "PRO" | "ENTERPRISE";

export type SubscriptionStatus = "ACTIVE" | "TRIALING" | "PAST_DUE" | "CANCELED" | "UNPAID" | "INCOMPLETE";

export type BillingInterval = "MONTHLY" | "YEARLY";

export type PlanPriceShape = {
  id: string;
  interval: BillingInterval;
  amount: number;
  currency: string;
};

export type PlanShape = {
  id: string;
  tier: PlanTier;
  name: string;
  description: string | null;
  features: string[];
  trialDays: number;
  prices: PlanPriceShape[];
};

export type SubscriptionShape = {
  id: string;
  status: SubscriptionStatus;
  billingInterval: BillingInterval;
  currentPeriodEnd: string | null;
  trialEnd: string | null;
  cancelAtPeriodEnd: boolean;
  plan: {
    id: string;
    tier: PlanTier;
    name: string;
  };
};
