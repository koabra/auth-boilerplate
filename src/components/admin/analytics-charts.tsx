"use client";

import { useEffect, useState } from "react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Card } from "@/components/ui/card";

type DashboardData = {
  visits: number;
  uniqueVisitors: number;
  topPages: Array<{ pageUrl: string; count: number }>;
  topClicks: Array<{ elementId: string; count: number }>;
  avgTimeOnPageMs: number;
};

export function AnalyticsCharts() {
  const [data, setData] = useState<DashboardData | null>(null);

  useEffect(() => {
    const load = async () => {
      const response = await fetch("/api/analytics/dashboard", { cache: "no-store" });
      if (!response.ok) return;
      const payload = (await response.json()) as DashboardData;
      setData(payload);
    };
    void load();
  }, []);

  if (!data) {
    return <p>Loading analytics...</p>;
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <Card>Visits: {data.visits}</Card>
        <Card>Unique visitors: {data.uniqueVisitors}</Card>
        <Card>Avg time/page: {Math.round(data.avgTimeOnPageMs / 1000)}s</Card>
      </div>
      <Card className="h-72">
        <p className="mb-3 text-sm font-medium">Top pages</p>
        {data.topPages.length ? (
          <ResponsiveContainer width="100%" height="90%">
            <BarChart data={data.topPages}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="pageUrl" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="count" fill="#2563eb" />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <p className="text-sm text-[var(--muted-foreground)]">No page-view data captured yet.</p>
        )}
      </Card>
      <Card className="h-72">
        <p className="mb-3 text-sm font-medium">Top clicks</p>
        {data.topClicks.length ? (
          <ResponsiveContainer width="100%" height="90%">
            <BarChart data={data.topClicks}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="elementId" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="count" fill="#16a34a" />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <p className="text-sm text-[var(--muted-foreground)]">
            No click data yet. Add <code>data-track</code> attributes to interactive elements.
          </p>
        )}
      </Card>
    </div>
  );
}
