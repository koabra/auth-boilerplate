import { Card } from "@/components/ui/card";

export default function DashboardHomePage() {
  return (
    <div className="space-y-4">
      <Card>
        <h2 className="text-lg font-semibold">Welcome</h2>
        <p className="text-sm text-zinc-600 dark:text-zinc-300">
          This starter includes auth, role-based access, comments, analytics, feature flags, and audit logs.
        </p>
      </Card>
    </div>
  );
}
