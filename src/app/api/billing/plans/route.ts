import { NextResponse } from "next/server";
import { getBillingMode } from "@/lib/billing/config";
import { getActivePlans } from "@/lib/billing/plan-service";

export async function GET() {
  const plans = await getActivePlans();
  return NextResponse.json({
    billingMode: getBillingMode(),
    plans,
  });
}
