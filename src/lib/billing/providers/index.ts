import { getPaymentProviderName } from "@/lib/billing/config";
import type { PaymentProvider } from "@/lib/billing/provider";
import { StripeProvider } from "@/lib/billing/providers/stripe";

let providerSingleton: PaymentProvider | null = null;

export function getPaymentProvider(): PaymentProvider {
  if (providerSingleton) return providerSingleton;

  const providerName = getPaymentProviderName();
  switch (providerName) {
    case "stripe":
      providerSingleton = new StripeProvider();
      return providerSingleton;
    default:
      throw new Error(`Unknown payment provider: ${providerName}`);
  }
}
