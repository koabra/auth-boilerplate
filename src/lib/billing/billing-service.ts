import { BillingInterval, PlanTier, Prisma, SubscriptionStatus } from "@prisma/client";
import { getAppUrl, getBillingMode, getDefaultTrialDays, getPaymentProviderName } from "@/lib/billing/config";
import { getPaymentProvider } from "@/lib/billing/providers";
import { getPlanById } from "@/lib/billing/plan-service";
import type { WebhookEvent } from "@/lib/billing/types";
import { prisma } from "@/lib/prisma";

function getTierRank(tier: PlanTier) {
  if (tier === PlanTier.ENTERPRISE) return 3;
  if (tier === PlanTier.PRO) return 2;
  return 1;
}

export function hasRequiredTier(currentTier: PlanTier | null | undefined, required: PlanTier | PlanTier[]) {
  if (!currentTier) return false;
  const requiredTiers = Array.isArray(required) ? required : [required];
  return requiredTiers.some((tier) => getTierRank(currentTier) >= getTierRank(tier));
}

export async function getSubscription(userId: string) {
  return prisma.subscription.findUnique({
    where: { userId },
    include: { plan: true },
  });
}

export async function createCheckout(userId: string, planId: string, interval: BillingInterval) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, email: true },
  });
  if (!user) throw new Error("User not found");

  const plan = await getPlanById(planId);
  if (!plan) throw new Error("Plan not found");

  if (plan.tier === PlanTier.FREE) {
    const price = plan.prices.find((item) => item.amount === 0) ?? plan.prices[0];
    if (!price) throw new Error("Free plan pricing is not configured");

    const now = new Date();
    await prisma.subscription.upsert({
      where: { userId },
      update: {
        planId: plan.id,
        status: SubscriptionStatus.ACTIVE,
        billingInterval: price.interval,
        provider: null,
        providerSubscriptionId: null,
        currentPeriodStart: now,
        currentPeriodEnd: null,
        trialStart: null,
        trialEnd: null,
        cancelAtPeriodEnd: false,
        canceledAt: null,
      },
      create: {
        userId,
        planId: plan.id,
        status: SubscriptionStatus.ACTIVE,
        billingInterval: price.interval,
        provider: null,
        currentPeriodStart: now,
      },
    });

    return {
      checkoutUrl: `${getAppUrl()}/dashboard/billing?updated=free`,
      freePlan: true,
    };
  }

  const price = plan.prices.find((item) => item.interval === interval);
  if (!price) throw new Error("No pricing found for selected interval");

  const provider = getPaymentProvider();
  const subscription = await prisma.subscription.findUnique({
    where: { userId },
    select: { providerCustomerId: true },
  });

  const trialDays =
    getBillingMode() === "trial" ? Math.max(plan.trialDays || getDefaultTrialDays(), getDefaultTrialDays()) : 0;

  const checkout = await provider.createCheckoutSession({
    userId,
    userEmail: user.email,
    customerId: subscription?.providerCustomerId,
    line: {
      planId: plan.id,
      planTier: plan.tier,
      interval: price.interval,
      providerPriceId: price.providerPriceId,
      amount: price.amount,
      currency: price.currency,
    },
    successUrl: `${getAppUrl()}/dashboard/billing?checkout=success`,
    cancelUrl: `${getAppUrl()}/pricing?checkout=cancelled`,
    trialDays,
    metadata: {
      userId,
      planId: plan.id,
      interval: price.interval,
      planTier: plan.tier,
    },
  });

  return {
    checkoutUrl: checkout.url,
    freePlan: false,
  };
}

export async function createPortal(userId: string) {
  const subscription = await prisma.subscription.findUnique({
    where: { userId },
    select: { providerCustomerId: true },
  });
  if (!subscription?.providerCustomerId) {
    throw new Error("No billing customer found");
  }
  const provider = getPaymentProvider();
  const portal = await provider.createPortalSession({
    customerId: subscription.providerCustomerId,
    returnUrl: `${getAppUrl()}/dashboard/billing`,
  });
  return portal.url;
}

export async function cancelSubscription(userId: string) {
  const subscription = await prisma.subscription.findUnique({
    where: { userId },
  });
  if (!subscription) throw new Error("Subscription not found");
  if (!subscription.providerSubscriptionId) throw new Error("No provider subscription found");

  const provider = getPaymentProvider();
  await provider.cancelSubscription(subscription.providerSubscriptionId);
}

export async function resumeSubscription(userId: string) {
  const subscription = await prisma.subscription.findUnique({
    where: { userId },
  });
  if (!subscription) throw new Error("Subscription not found");
  if (!subscription.providerSubscriptionId) throw new Error("No provider subscription found");

  const provider = getPaymentProvider();
  await provider.resumeSubscription(subscription.providerSubscriptionId);
}

async function handleCheckoutCompleted(event: Extract<WebhookEvent, { type: "checkout.session.completed" }>) {
  const userId = event.metadata.userId;
  const planId = event.metadata.planId;
  const rawInterval = event.metadata.interval;
  const interval = rawInterval === BillingInterval.YEARLY ? BillingInterval.YEARLY : BillingInterval.MONTHLY;

  if (!userId || !planId) return;

  const existingPlan = await prisma.plan.findUnique({ where: { id: planId } });
  if (!existingPlan) return;

  await prisma.subscription.upsert({
    where: { userId },
    update: {
      planId,
      status: SubscriptionStatus.ACTIVE,
      provider: getPaymentProviderName(),
      providerSubscriptionId: event.subscriptionId,
      providerCustomerId: event.customerId,
      billingInterval: interval,
      cancelAtPeriodEnd: false,
      canceledAt: null,
    },
    create: {
      userId,
      planId,
      status: SubscriptionStatus.ACTIVE,
      provider: getPaymentProviderName(),
      providerSubscriptionId: event.subscriptionId,
      providerCustomerId: event.customerId,
      billingInterval: interval,
    },
  });
}

async function handleSubscriptionEvent(
  event: Extract<WebhookEvent, { type: "customer.subscription.updated" | "customer.subscription.deleted" }>,
) {
  const orFilters: Prisma.SubscriptionWhereInput[] = [{ providerSubscriptionId: event.subscriptionId }];
  if (event.customerId) {
    orFilters.push({ providerCustomerId: event.customerId });
  }

  const subscription = await prisma.subscription.findFirst({
    where: {
      OR: orFilters,
    },
  });
  if (!subscription) return;

  await prisma.subscription.update({
    where: { id: subscription.id },
    data: {
      status: event.status,
      cancelAtPeriodEnd: event.cancelAtPeriodEnd,
      currentPeriodStart: event.currentPeriodStart,
      currentPeriodEnd: event.currentPeriodEnd,
      trialStart: event.trialStart,
      trialEnd: event.trialEnd,
      canceledAt: event.type === "customer.subscription.deleted" ? new Date() : null,
    },
  });
}

async function handleInvoiceEvent(event: Extract<WebhookEvent, { type: "invoice.payment_failed" | "invoice.payment_succeeded" }>) {
  if (!event.subscriptionId) return;

  const orFilters: Prisma.SubscriptionWhereInput[] = [{ providerSubscriptionId: event.subscriptionId }];
  if (event.customerId) {
    orFilters.push({ providerCustomerId: event.customerId });
  }

  const subscription = await prisma.subscription.findFirst({
    where: {
      OR: orFilters,
    },
  });
  if (!subscription) return;

  await prisma.subscription.update({
    where: { id: subscription.id },
    data: {
      status: event.type === "invoice.payment_failed" ? SubscriptionStatus.PAST_DUE : SubscriptionStatus.ACTIVE,
    },
  });
}

export async function handleWebhookEvent(event: WebhookEvent) {
  if (event.type === "checkout.session.completed") {
    await handleCheckoutCompleted(event);
    return;
  }
  if (event.type === "customer.subscription.updated" || event.type === "customer.subscription.deleted") {
    await handleSubscriptionEvent(event);
    return;
  }
  if (event.type === "invoice.payment_failed" || event.type === "invoice.payment_succeeded") {
    await handleInvoiceEvent(event);
  }
}
