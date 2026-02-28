"use client";

import { useEffect, useMemo, useState } from "react";
import {
  EmailAuthProvider,
  linkWithCredential,
  sendPasswordResetEmail,
  updatePassword,
} from "firebase/auth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/components/providers/auth-provider";
import { getFirebaseAuthClient } from "@/lib/firebase/client";

type ProfilePayload = {
  id: string;
  email: string;
  pseudonym: string;
  realName: string | null;
  roles: string[];
  linkedProviders: string[];
  emailVerified: boolean;
};

export function ProfileForm() {
  const { refresh } = useAuth();
  const [profile, setProfile] = useState<ProfilePayload | null>(null);
  const [pseudonym, setPseudonym] = useState("");
  const [realName, setRealName] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const hasPasswordProvider = useMemo(
    () => profile?.linkedProviders.includes("firebase") ?? false,
    [profile],
  );

  const load = async () => {
    const response = await fetch("/api/profile", { cache: "no-store" });
    if (!response.ok) return;
    const payload = (await response.json()) as { profile: ProfilePayload };
    setProfile(payload.profile);
    setPseudonym(payload.profile.pseudonym);
    setRealName(payload.profile.realName ?? "");
  };

  useEffect(() => {
    void load();
  }, []);

  const toErrorMessage = async (response: Response, fallback: string) => {
    try {
      const payload = (await response.json()) as { error?: string };
      return payload.error || fallback;
    } catch {
      return fallback;
    }
  };

  const saveProfile = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);
    try {
      const response = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pseudonym, realName: realName || null }),
      });
      if (!response.ok) {
        throw new Error(await toErrorMessage(response, "Could not update profile"));
      }
      setMessage("Profile updated.");
      await load();
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update profile");
    } finally {
      setLoading(false);
    }
  };

  const savePassword = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);
    try {
      const auth = getFirebaseAuthClient();
      const user = auth.currentUser;
      if (!user || !profile) throw new Error("Sign in again to update password");
      if (!password || password.length < 6) throw new Error("Password must be at least 6 characters");

      if (!hasPasswordProvider) {
        const credential = EmailAuthProvider.credential(profile.email, password);
        await linkWithCredential(user, credential);
      } else {
        await updatePassword(user, password);
      }
      setPassword("");
      setMessage(hasPasswordProvider ? "Password updated." : "Password login linked to this account.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Password update failed");
    } finally {
      setLoading(false);
    }
  };

  const sendReset = async () => {
    setLoading(true);
    setError(null);
    setMessage(null);
    try {
      const auth = getFirebaseAuthClient();
      if (!profile?.email) throw new Error("No email found");
      await sendPasswordResetEmail(auth, profile.email);
      setMessage("Reset email sent.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not send reset email");
    } finally {
      setLoading(false);
    }
  };

  if (!profile) return <p>Loading profile...</p>;

  return (
    <div className="space-y-4">
      <Card className="space-y-3">
        <h3 className="text-lg font-semibold">Account</h3>
        <p className="text-sm text-[var(--muted-foreground)]">Email: {profile.email}</p>
        <p className="text-sm text-[var(--muted-foreground)]">Roles: {profile.roles.join(", ") || "user"}</p>
        <p className="text-sm text-[var(--muted-foreground)]">Email verified: {profile.emailVerified ? "Yes" : "No"}</p>
      </Card>

      <Card className="space-y-3">
        <h3 className="text-lg font-semibold">Public profile</h3>
        <form className="grid gap-3 md:grid-cols-2" onSubmit={saveProfile}>
          <div className="space-y-1">
            <Input
              value={pseudonym}
              onChange={(event) => setPseudonym(event.target.value)}
              pattern="[A-Za-z0-9_]+"
              title="Use letters, numbers, and underscores only (no spaces)."
              placeholder="pseudonym"
            />
            <p className="text-xs text-[var(--muted-foreground)]">
              Allowed: letters, numbers, underscore (`_`). No spaces.
            </p>
          </div>
          <Input value={realName} onChange={(event) => setRealName(event.target.value)} placeholder="Private real name" />
          <Button className="md:col-span-2" data-track="profile.save" disabled={loading} type="submit">
            Save profile
          </Button>
        </form>
      </Card>

      <Card className="space-y-3">
        <h3 className="text-lg font-semibold">Password</h3>
        <form className="space-y-2" onSubmit={savePassword}>
          <Input
            type="password"
            minLength={6}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder={hasPasswordProvider ? "New password" : "Set a password for email sign-in"}
          />
          <div className="flex flex-wrap gap-2">
            <Button data-track="profile.password.save" disabled={loading} type="submit">
              {hasPasswordProvider ? "Update password" : "Set password"}
            </Button>
            <Button data-track="profile.password.reset" disabled={loading} onClick={sendReset} type="button" variant="outline">
              Send reset email
            </Button>
          </div>
        </form>
      </Card>
      {message ? <p className="text-sm text-emerald-600 dark:text-emerald-400">{message}</p> : null}
      {error ? <p className="text-sm text-red-500">{error}</p> : null}
    </div>
  );
}
