"use client";

import { useEffect } from "react";
import { initAnalyticsTracking } from "@/lib/analytics-tracker";

export function AnalyticsProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    const cleanup = initAnalyticsTracking();
    return cleanup;
  }, []);

  return <>{children}</>;
}
