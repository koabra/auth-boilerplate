import { PlanTier } from "@prisma/client";
import { getBillingMode, getPaymentProviderName } from "@/lib/billing/config";
import { prisma } from "@/lib/prisma";

export async function getActivePlans() {
  const billingMode = getBillingMode();
  const provider = getPaymentProviderName();

  const plans = await prisma.plan.findMany({
    where:
      billingMode === "trial"
        ? { isActive: true, tier: { in: [PlanTier.PRO, PlanTier.ENTERPRISE] } }
        : { isActive: true },
    orderBy: [{ sortOrder: "asc" }],
    include: {
      prices: {
        where: {
          provider: { in: [provider, "default"] },
        },
      },
    },
  });

  return plans.map((plan) => ({
    ...plan,
    prices: plan.prices.sort((a, b) => a.amount - b.amount),
  }));
}

export async function getPlanByTier(tier: PlanTier) {
  return prisma.plan.findUnique({
    where: { tier },
    include: { prices: true },
  });
}

export async function getPlanById(planId: string) {
  const provider = getPaymentProviderName();
  const plan = await prisma.plan.findUnique({
    where: { id: planId },
    include: {
      prices: {
        where: {
          provider: { in: [provider, "default"] },
        },
      },
    },
  });
  if (!plan || !plan.isActive) return null;

  if (getBillingMode() === "trial" && plan.tier === PlanTier.FREE) {
    return null;
  }

  return plan;
}
