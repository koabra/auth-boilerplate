import type {
  CheckoutResult,
  CreateCheckoutParams,
  CreatePortalParams,
  PortalResult,
  WebhookEvent,
} from "@/lib/billing/types";

export interface PaymentProvider {
  name: string;
  createCustomer(email: string, metadata?: Record<string, string>): Promise<string>;
  createCheckoutSession(params: CreateCheckoutParams): Promise<CheckoutResult>;
  createPortalSession(params: CreatePortalParams): Promise<PortalResult>;
  cancelSubscription(providerSubscriptionId: string): Promise<void>;
  resumeSubscription(providerSubscriptionId: string): Promise<void>;
  parseWebhookEvent(payload: string, signature: string): Promise<WebhookEvent>;
}
