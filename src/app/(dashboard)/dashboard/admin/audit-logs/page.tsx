"use client";

import { useCallback, useEffect, useState } from "react";
import { PermissionGate } from "@/components/layout/permission-gate";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

type AuditLog = {
  id: string;
  action: string;
  resourceType: string;
  resourceId: string | null;
  metadata: unknown;
  createdAt: string;
  user: { email: string } | null;
};

export default function AuditLogsPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [query, setQuery] = useState("");
  const [action, setAction] = useState("");
  const [resourceType, setResourceType] = useState("");
  const [nextCursor, setNextCursor] = useState<string | null>(null);

  const load = useCallback(async (cursor?: string | null) => {
    const params = new URLSearchParams();
    if (query) params.set("q", query);
    if (action) params.set("action", action);
    if (resourceType) params.set("resourceType", resourceType);
    params.set("limit", "40");
    if (cursor) params.set("cursor", cursor);
    const response = await fetch(`/api/audit-logs?${params.toString()}`, { cache: "no-store" });
    if (!response.ok) return;
    const data = (await response.json()) as { logs: AuditLog[]; nextCursor: string | null };
    setLogs((prev) => (cursor ? [...prev, ...data.logs] : data.logs));
    setNextCursor(data.nextCursor);
  }, [query, action, resourceType]);

  useEffect(() => {
    void load(null);
  }, [load]);

  useEffect(() => {
    const timeout = setTimeout(() => {
      void load(null);
    }, 250);
    return () => clearTimeout(timeout);
  }, [query, action, resourceType, load]);

  return (
    <PermissionGate resource="audit_logs" action="read" fallback={<p>Not allowed.</p>}>
      <div className="space-y-4">
        <h2 className="text-xl font-semibold">Audit Logs</h2>
        <Card className="grid gap-2 md:grid-cols-3">
          <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search action/resource..." />
          <Input value={action} onChange={(event) => setAction(event.target.value)} placeholder="Filter action..." />
          <Input
            value={resourceType}
            onChange={(event) => setResourceType(event.target.value)}
            placeholder="Filter resource type..."
          />
        </Card>
        <Card className="space-y-1 font-mono text-xs">
          {logs.map((log) => (
            <div className="grid grid-cols-[170px_1fr] gap-2 border-b border-[var(--border)] py-1" key={log.id}>
              <span className="text-[var(--muted-foreground)]">{new Date(log.createdAt).toLocaleString()}</span>
              <span>
                <span className="text-indigo-500">{log.action}</span>{" "}
                <span className="text-[var(--muted-foreground)]">{log.resourceType}</span>{" "}
                <span className="text-[var(--muted-foreground)]">{log.resourceId ?? "-"}</span>{" "}
                <span className="text-emerald-500">{log.user?.email ?? "system"}</span>
              </span>
            </div>
          ))}
          {!logs.length ? <p className="text-[var(--muted-foreground)]">No logs found.</p> : null}
        </Card>
        {nextCursor ? (
          <Button data-track="audit.load_more" onClick={() => void load(nextCursor)} variant="outline">
            Load more
          </Button>
        ) : null}
      </div>
    </PermissionGate>
  );
}
