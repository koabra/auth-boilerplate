"use client";

import { useEffect, useState } from "react";
import { PermissionGate } from "@/components/layout/permission-gate";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { getFirebaseAuthClient } from "@/lib/firebase/client";

type Flag = {
  id: string;
  key: string;
  description: string | null;
  isEnabled: boolean;
};

type DebugCheck = {
  ok: boolean;
  message: string;
  details?: string;
};

type DebugResponse = {
  ok: boolean;
  checks: {
    verifyIdToken: DebugCheck;
    generatePasswordResetLink: DebugCheck;
  };
};

export default function AdminSettingsPage() {
  const [flags, setFlags] = useState<Flag[]>([]);
  const [debugToken, setDebugToken] = useState("");
  const [debugResetEmail, setDebugResetEmail] = useState("");
  const [debugLoading, setDebugLoading] = useState(false);
  const [debugError, setDebugError] = useState<string | null>(null);
  const [debugResult, setDebugResult] = useState<DebugResponse | null>(null);
  const [tokenStatus, setTokenStatus] = useState<string | null>(null);

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

  const runFirebaseAdminDebug = async () => {
    setDebugLoading(true);
    setDebugError(null);
    setDebugResult(null);
    try {
      const response = await fetch("/api/debug/firebase-admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          idToken: debugToken.trim() || undefined,
          resetEmail: debugResetEmail.trim() || undefined,
        }),
      });

      const payload = (await response.json()) as DebugResponse | { error?: string };
      if (!response.ok || !("checks" in payload)) {
        throw new Error(("error" in payload && payload.error) || "Debug check failed");
      }
      setDebugResult(payload);
    } catch (error) {
      setDebugError(error instanceof Error ? error.message : "Debug check failed");
    } finally {
      setDebugLoading(false);
    }
  };

  const attachCurrentIdToken = async () => {
    setDebugError(null);
    setTokenStatus(null);
    try {
      const auth = getFirebaseAuthClient();
      const user = auth.currentUser;
      if (!user) {
        setTokenStatus("No Firebase user found in this browser session.");
        return;
      }
      const token = await user.getIdToken(true);
      setDebugToken(token);
      setTokenStatus(`Token loaded from current user (length: ${token.length}).`);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Could not fetch token";
      setDebugError(message);
    }
  };

  return (
    <PermissionGate resource="settings" action="manage" fallback={<p>Not allowed.</p>}>
      <div className="space-y-4">
        <h2 className="text-xl font-semibold">Settings & Feature Flags</h2>
        {flags.map((flag) => (
          <Card className="flex items-center justify-between" key={flag.id}>
            <div>
              <p className="font-medium">{flag.key}</p>
              <p className="text-sm text-[var(--muted-foreground)]">{flag.description}</p>
            </div>
            <Button data-track={`feature_flag.${flag.key}`} onClick={() => toggle(flag.key, flag.isEnabled)} variant="outline">
              {flag.isEnabled ? "Disable" : "Enable"}
            </Button>
          </Card>
        ))}
        <Card className="space-y-4">
          <div className="space-y-1">
            <h3 className="text-lg font-semibold">Firebase Admin Debug</h3>
            <p className="text-sm text-[var(--muted-foreground)]">
              Checks token verification path and password reset link generation separately.
            </p>
          </div>
          <div className="grid gap-3">
            <Input
              value={debugResetEmail}
              onChange={(event) => setDebugResetEmail(event.target.value)}
              placeholder="Reset email (optional, defaults to your session email)"
              type="email"
            />
            <Input
              value={debugToken}
              onChange={(event) => setDebugToken(event.target.value)}
              placeholder="Firebase ID token (optional, used for verifyIdToken check)"
            />
            <Button
              data-track="settings.firebase_admin_debug.attach_token"
              disabled={debugLoading}
              onClick={attachCurrentIdToken}
              variant="secondary"
            >
              Use current browser Firebase token
            </Button>
            <Button
              data-track="settings.firebase_admin_debug.run"
              disabled={debugLoading}
              onClick={runFirebaseAdminDebug}
              variant="outline"
            >
              {debugLoading ? "Running checks..." : "Run Firebase Admin checks"}
            </Button>
          </div>
          {tokenStatus ? <p className="text-sm text-[var(--muted-foreground)]">{tokenStatus}</p> : null}
          {debugError ? <p className="text-sm text-red-500">{debugError}</p> : null}
          {debugResult ? (
            <div className="space-y-2 text-sm">
              <p className={debugResult.ok ? "text-emerald-600 dark:text-emerald-400" : "text-red-500"}>
                Overall: {debugResult.ok ? "All checks passed" : "One or more checks failed"}
              </p>
              <div className="rounded-md border border-[var(--border)] p-3">
                <p className="font-medium">verifyIdToken</p>
                <p>{debugResult.checks.verifyIdToken.message}</p>
                {debugResult.checks.verifyIdToken.details ? (
                  <p className="break-all text-[var(--muted-foreground)]">{debugResult.checks.verifyIdToken.details}</p>
                ) : null}
              </div>
              <div className="rounded-md border border-[var(--border)] p-3">
                <p className="font-medium">generatePasswordResetLink</p>
                <p>{debugResult.checks.generatePasswordResetLink.message}</p>
                {debugResult.checks.generatePasswordResetLink.details ? (
                  <p className="break-all text-[var(--muted-foreground)]">
                    {debugResult.checks.generatePasswordResetLink.details}
                  </p>
                ) : null}
              </div>
            </div>
          ) : null}
        </Card>
      </div>
    </PermissionGate>
  );
}
