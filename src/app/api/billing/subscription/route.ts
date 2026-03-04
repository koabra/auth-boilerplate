import { NextResponse } from "next/server";
import { z } from "zod";
import { withAuth } from "@/lib/auth";
import { cancelSubscription, getSubscription, resumeSubscription } from "@/lib/billing/billing-service";
import { getBillingMode } from "@/lib/billing/config";

const actionSchema = z.object({
  action: z.enum(["cancel", "resume"]),
});

export const GET = withAuth(async ({ session }) => {
  const subscription = await getSubscription(session.userId);
  return NextResponse.json({
    billingMode: getBillingMode(),
    subscription,
  });
});

export const PATCH = withAuth(async ({ req, session }) => {
  try {
    const payload = actionSchema.parse(await req.json());
    if (payload.action === "cancel") {
      await cancelSubscription(session.userId);
    } else {
      await resumeSubscription(session.userId);
    }
    const subscription = await getSubscription(session.userId);
    return NextResponse.json({ subscription });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not update subscription";
    return NextResponse.json({ error: message }, { status: 400 });
  }
});
