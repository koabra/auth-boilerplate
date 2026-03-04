import { NextResponse } from "next/server";
import { withAuth } from "@/lib/auth";
import { createPortal } from "@/lib/billing/billing-service";

export const POST = withAuth(async ({ session }) => {
  try {
    const portalUrl = await createPortal(session.userId);
    return NextResponse.json({ portalUrl });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not create portal session";
    return NextResponse.json({ error: message }, { status: 400 });
  }
});
