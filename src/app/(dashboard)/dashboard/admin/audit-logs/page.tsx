"use client";

import { useEffect, useState } from "react";
import { PermissionGate } from "@/components/layout/permission-gate";
import { Card } from "@/components/ui/card";

type AuditLog = {
  id: string;
  action: string;
  resourceType: string;
  createdAt: string;
  user: { email: string } | null;
};

export default function AuditLogsPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);

  useEffect(() => {
    const load = async () => {
      const response = await fetch("/api/audit-logs", { cache: "no-store" });
      if (!response.ok) return;
      const data = (await response.json()) as { logs: AuditLog[] };
      setLogs(data.logs);
    };
    void load();
  }, []);

  return (
    <PermissionGate resource="audit_logs" action="read" fallback={<p>Not allowed.</p>}>
      <div className="space-y-4">
        <h2 className="text-xl font-semibold">Audit Logs</h2>
        {logs.map((log) => (
          <Card key={log.id}>
            <p className="font-medium">
              {log.action} ({log.resourceType})
            </p>
            <p className="text-sm text-zinc-500">
              by {log.user?.email ?? "system"} at {new Date(log.createdAt).toLocaleString()}
            </p>
          </Card>
        ))}
      </div>
    </PermissionGate>
  );
}
