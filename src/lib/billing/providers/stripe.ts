import { SubscriptionStatus } from "@prisma/client";
import Stripe from "stripe";
import type { PaymentProvider } from "@/lib/billing/provider";
import type { CreateCheckoutParams, CreatePortalParams, WebhookEvent } from "@/lib/billing/types";

function getStripeClient() {
  const apiKey = process.env.STRIPE_SECRET_KEY;
  if (!apiKey) throw new Error("Missing STRIPE_SECRET_KEY");
  return new Stripe(apiKey);
}

function toDate(unixSeconds: number | null | undefined) {
  if (!unixSeconds) return undefined;
  return new Date(unixSeconds * 1000);
}

function mapStripeSubscriptionStatus(status: Stripe.Subscription.Status): SubscriptionStatus {
  switch (status) {
    case "active":
      return SubscriptionStatus.ACTIVE;
    case "trialing":
      return SubscriptionStatus.TRIALING;
    case "past_due":
      return SubscriptionStatus.PAST_DUE;
    case "canceled":
      return SubscriptionStatus.CANCELED;
    case "unpaid":
      return SubscriptionStatus.UNPAID;
    case "incomplete":
    case "incomplete_expired":
    case "paused":
      return SubscriptionStatus.INCOMPLETE;
    default:
      return SubscriptionStatus.INCOMPLETE;
  }
}

function toMetadata(
  metadata: Stripe.Metadata | Record<string, unknown> | null | undefined,
): Record<string, string> {
  if (!metadata) return {};

  return Object.entries(metadata).reduce<Record<string, string>>((acc, [key, value]) => {
    if (typeof value === "string") {
      acc[key] = value;
    }
    return acc;
  }, {});
}

export class StripeProvider implements PaymentProvider {
  name = "stripe";

  async createCustomer(email: string, metadata?: Record<string, string>) {
    const stripe = getStripeClient();
    const customer = await stripe.customers.create({ email, metadata });
    return customer.id;
  }

  async createCheckoutSession(params: CreateCheckoutParams) {
    const stripe = getStripeClient();

    if (!params.line.providerPriceId) {
      throw new Error("No provider price configured for selected plan");
    }

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      success_url: params.successUrl,
      cancel_url: params.cancelUrl,
      customer: params.customerId ?? undefined,
      customer_email: params.customerId ? undefined : params.userEmail,
      line_items: [{ price: params.line.providerPriceId, quantity: 1 }],
      subscription_data: {
        trial_period_days: params.trialDays && params.trialDays > 0 ? params.trialDays : undefined,
        metadata: params.metadata,
      },
      metadata: params.metadata,
    });

    if (!session.url) {
      throw new Error("Stripe checkout session did not return a URL");
    }

    return {
      sessionId: session.id,
      url: session.url,
    };
  }

  async createPortalSession(params: CreatePortalParams) {
    const stripe = getStripeClient();
    const session = await stripe.billingPortal.sessions.create({
      customer: params.customerId,
      return_url: params.returnUrl,
    });
    return { url: session.url };
  }

  async cancelSubscription(providerSubscriptionId: string) {
    const stripe = getStripeClient();
    await stripe.subscriptions.update(providerSubscriptionId, {
      cancel_at_period_end: true,
    });
  }

  async resumeSubscription(providerSubscriptionId: string) {
    const stripe = getStripeClient();
    await stripe.subscriptions.update(providerSubscriptionId, {
      cancel_at_period_end: false,
    });
  }

  async parseWebhookEvent(payload: string, signature: string): Promise<WebhookEvent> {
    const stripe = getStripeClient();
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!webhookSecret) throw new Error("Missing STRIPE_WEBHOOK_SECRET");

    const event = stripe.webhooks.constructEvent(payload, signature, webhookSecret);

    switch (event.type) {
      case "checkout.session.completed": {
        const data = event.data.object as Stripe.Checkout.Session;
        return {
          type: "checkout.session.completed",
          customerId: typeof data.customer === "string" ? data.customer : null,
          subscriptionId: typeof data.subscription === "string" ? data.subscription : null,
          checkoutSessionId: data.id,
          metadata: toMetadata(data.metadata),
        };
      }
      case "customer.subscription.updated":
      case "customer.subscription.deleted": {
        const data = event.data.object as Stripe.Subscription;
        const firstItem = data.items.data[0];
        return {
          type: event.type,
          customerId: typeof data.customer === "string" ? data.customer : null,
          subscriptionId: data.id,
          status: mapStripeSubscriptionStatus(data.status),
          cancelAtPeriodEnd: data.cancel_at_period_end,
          currentPeriodStart: toDate(firstItem?.current_period_start),
          currentPeriodEnd: toDate(firstItem?.current_period_end),
          trialStart: toDate(data.trial_start),
          trialEnd: toDate(data.trial_end),
          metadata: toMetadata(data.metadata),
        };
      }
      case "invoice.payment_failed":
      case "invoice.payment_succeeded": {
        const data = event.data.object as Stripe.Invoice;
        const subscriptionRef = data.parent?.subscription_details?.subscription;
        return {
          type: event.type,
          customerId: typeof data.customer === "string" ? data.customer : null,
          subscriptionId: typeof subscriptionRef === "string" ? subscriptionRef : null,
        };
      }
      default:
        throw new Error(`Unhandled Stripe event type: ${event.type}`);
    }
  }
}
