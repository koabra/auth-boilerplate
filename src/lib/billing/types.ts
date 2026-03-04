import type { BillingInterval, PlanTier, SubscriptionStatus } from "@prisma/client";

export type BillingMode = "freemium" | "trial";

export type CheckoutLine = {
  planId: string;
  planTier: PlanTier;
  interval: BillingInterval;
  providerPriceId?: string | null;
  amount: number;
  currency: string;
};

export type CreateCheckoutParams = {
  userId: string;
  userEmail: string;
  customerId?: string | null;
  line: CheckoutLine;
  successUrl: string;
  cancelUrl: string;
  trialDays?: number;
  metadata?: Record<string, string>;
};

export type CheckoutResult = {
  sessionId: string;
  url: string;
};

export type CreatePortalParams = {
  customerId: string;
  returnUrl: string;
};

export type PortalResult = {
  url: string;
};

export type WebhookEvent =
  | {
      type: "checkout.session.completed";
      customerId: string | null;
      subscriptionId: string | null;
      checkoutSessionId: string;
      metadata: Record<string, string>;
    }
  | {
      type: "customer.subscription.updated" | "customer.subscription.deleted";
      customerId: string | null;
      subscriptionId: string;
      status: SubscriptionStatus;
      cancelAtPeriodEnd: boolean;
      currentPeriodStart?: Date;
      currentPeriodEnd?: Date;
      trialStart?: Date;
      trialEnd?: Date;
      metadata: Record<string, string>;
    }
  | {
      type: "invoice.payment_failed" | "invoice.payment_succeeded";
      customerId: string | null;
      subscriptionId: string | null;
    };
