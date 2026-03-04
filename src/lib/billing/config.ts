import type { BillingMode } from "@/lib/billing/types";

const DEFAULT_BILLING_MODE: BillingMode = "freemium";
const DEFAULT_PAYMENT_PROVIDER = "stripe";
const DEFAULT_TRIAL_DAYS = 7;

function normalizeMode(value: string | undefined): BillingMode {
  if (value === "freemium" || value === "trial") return value;
  return DEFAULT_BILLING_MODE;
}

export function getBillingMode(): BillingMode {
  return normalizeMode(process.env.BILLING_MODE);
}

export function getPaymentProviderName() {
  return process.env.PAYMENT_PROVIDER ?? DEFAULT_PAYMENT_PROVIDER;
}

export function getDefaultTrialDays() {
  const value = Number(process.env.BILLING_TRIAL_DAYS ?? DEFAULT_TRIAL_DAYS);
  if (Number.isNaN(value) || value < 0) return DEFAULT_TRIAL_DAYS;
  return value;
}

export function getAppUrl() {
  return process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
}
