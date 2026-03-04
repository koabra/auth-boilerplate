import { PlanTier, SubscriptionStatus } from "@prisma/client";
import { NextResponse } from "next/server";
import { hasRequiredTier } from "@/lib/billing/billing-service";
import { withAuth, type RequestContext } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export function withSubscription(
  requiredTier: PlanTier | PlanTier[],
  handler: (context: RequestContext) => Promise<NextResponse>,
) {
  return withAuth(async (context) => {
    const subscription = await prisma.subscription.findUnique({
      where: { userId: context.session.userId },
      include: { plan: true },
    });

    const isValid =
      subscription &&
      (subscription.status === SubscriptionStatus.ACTIVE || subscription.status === SubscriptionStatus.TRIALING) &&
      hasRequiredTier(subscription.plan.tier, requiredTier);

    if (!isValid) {
      return NextResponse.json(
        {
          error: "Payment Required",
          code: "SUBSCRIPTION_REQUIRED",
        },
        { status: 402 },
      );
    }

    return handler(context);
  });
}
