import { BillingInterval } from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";
import { withAuth } from "@/lib/auth";
import { createCheckout } from "@/lib/billing/billing-service";

const bodySchema = z.object({
  planId: z.string().min(1),
  interval: z.enum([BillingInterval.MONTHLY, BillingInterval.YEARLY]),
});

export const POST = withAuth(async ({ req, session }) => {
  try {
    const payload = bodySchema.parse(await req.json());
    const result = await createCheckout(session.userId, payload.planId, payload.interval);
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not create checkout session";
    return NextResponse.json({ error: message }, { status: 400 });
  }
});
