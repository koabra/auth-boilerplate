"use client";

import { useEffect, useState } from "react";
import { PermissionGate } from "@/components/layout/permission-gate";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

type Flag = {
  id: string;
  key: string;
  description: string | null;
  isEnabled: boolean;
};

export default function AdminSettingsPage() {
  const [flags, setFlags] = useState<Flag[]>([]);

  const load = async () => {
    const response = await fetch("/api/feature-flags", { cache: "no-store" });
    if (!response.ok) return;
    const data = (await response.json()) as { flags: Flag[] };
    setFlags(data.flags);
  };

  useEffect(() => {
    void load();
  }, []);

  const toggle = async (key: string, isEnabled: boolean) => {
    await fetch("/api/feature-flags", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key, isEnabled: !isEnabled }),
    });
    await load();
  };

  return (
    <PermissionGate resource="settings" action="manage" fallback={<p>Not allowed.</p>}>
      <div className="space-y-4">
        <h2 className="text-xl font-semibold">Settings & Feature Flags</h2>
        {flags.map((flag) => (
          <Card className="flex items-center justify-between" key={flag.id}>
            <div>
              <p className="font-medium">{flag.key}</p>
              <p className="text-sm text-zinc-500">{flag.description}</p>
            </div>
            <Button onClick={() => toggle(flag.key, flag.isEnabled)} variant="outline">
              {flag.isEnabled ? "Disable" : "Enable"}
            </Button>
          </Card>
        ))}
      </div>
    </PermissionGate>
  );
}
