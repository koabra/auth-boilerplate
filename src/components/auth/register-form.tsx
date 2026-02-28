"use client";

import { useState } from "react";
import { createUserWithEmailAndPassword, updateProfile } from "firebase/auth";
import { useRouter } from "next/navigation";
import { getFirebaseAuthClient } from "@/lib/firebase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";

export function RegisterForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const toErrorMessage = async (response: Response) => {
    const fallback = "Could not create app session";
    try {
      const payload = (await response.json()) as { error?: string };
      return payload.error || fallback;
    } catch {
      return fallback;
    }
  };

  const onRegister = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const firebaseAuth = getFirebaseAuthClient();
      const credentials = await createUserWithEmailAndPassword(firebaseAuth, email, password);
      await updateProfile(credentials.user, { displayName: name });
      const idToken = await credentials.user.getIdToken();

      const response = await fetch("/api/auth/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idToken }),
      });
      if (!response.ok) throw new Error(await toErrorMessage(response));

      router.replace("/dashboard");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create account");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="mx-auto w-full max-w-md space-y-4">
      <h1 className="text-xl font-semibold">Create account</h1>
      <form className="space-y-3" onSubmit={onRegister}>
        <Input value={name} onChange={(event) => setName(event.target.value)} placeholder="Name" required />
        <Input value={email} onChange={(event) => setEmail(event.target.value)} type="email" placeholder="Email" required />
        <Input
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          type="password"
          minLength={6}
          placeholder="Password"
          required
        />
        <Button className="w-full" disabled={loading} type="submit">
          Create Account
        </Button>
      </form>
      {error && <p className="text-sm text-red-500">{error}</p>}
    </Card>
  );
}
