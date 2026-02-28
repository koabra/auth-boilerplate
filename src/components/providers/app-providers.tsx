"use client";

import { AnalyticsProvider } from "@/components/providers/analytics-provider";
import { AuthProvider } from "@/components/providers/auth-provider";
import { ThemeProvider } from "@/components/providers/theme-provider";

export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <AuthProvider>
        <AnalyticsProvider>{children}</AnalyticsProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
