import { NextResponse } from "next/server";
import { handleWebhookEvent } from "@/lib/billing/billing-service";
import { getPaymentProvider } from "@/lib/billing/providers";

export async function POST(req: Request) {
  try {
    const signature = req.headers.get("stripe-signature");
    if (!signature) {
      return NextResponse.json({ error: "Missing stripe-signature header" }, { status: 400 });
    }

    const payload = await req.text();
    const provider = getPaymentProvider();
    if (provider.name !== "stripe") {
      return NextResponse.json({ error: "Stripe webhook is disabled" }, { status: 400 });
    }

    const event = await provider.parseWebhookEvent(payload, signature);
    await handleWebhookEvent(event);

    return NextResponse.json({ received: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Webhook processing failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
