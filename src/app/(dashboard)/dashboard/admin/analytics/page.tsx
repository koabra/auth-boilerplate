import { AnalyticsCharts } from "@/components/admin/analytics-charts";
import { PermissionGate } from "@/components/layout/permission-gate";

export default function AdminAnalyticsPage() {
  return (
    <PermissionGate resource="analytics" action="read" fallback={<p>Not allowed.</p>}>
      <div className="space-y-4">
        <h2 className="text-xl font-semibold">Analytics</h2>
        <AnalyticsCharts />
      </div>
    </PermissionGate>
  );
}
