"use client";

import { useState } from "react";
import { GoogleAuthProvider, signInWithEmailAndPassword, signInWithPopup } from "firebase/auth";
import { useRouter } from "next/navigation";
import { getFirebaseAuthClient } from "@/lib/firebase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";

export function LoginForm() {
  const router = useRouter();
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

  const createServerSession = async () => {
    const firebaseAuth = getFirebaseAuthClient();
    const firebaseUser = firebaseAuth.currentUser;
    if (!firebaseUser) return;
    const idToken = await firebaseUser.getIdToken();
    const response = await fetch("/api/auth/session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ idToken }),
    });
    if (!response.ok) throw new Error(await toErrorMessage(response));
    router.replace("/dashboard");
    router.refresh();
  };

  const onEmailLogin = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const firebaseAuth = getFirebaseAuthClient();
      await signInWithEmailAndPassword(firebaseAuth, email, password);
      await createServerSession();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Invalid credentials");
    } finally {
      setLoading(false);
    }
  };

  const onGoogleLogin = async () => {
    setError(null);
    setLoading(true);
    try {
      const firebaseAuth = getFirebaseAuthClient();
      await signInWithPopup(firebaseAuth, new GoogleAuthProvider());
      await createServerSession();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Google sign-in failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="mx-auto w-full max-w-md space-y-4">
      <h1 className="text-xl font-semibold">Sign in</h1>
      <form className="space-y-3" onSubmit={onEmailLogin}>
        <Input value={email} onChange={(event) => setEmail(event.target.value)} type="email" placeholder="Email" required />
        <Input
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          type="password"
          placeholder="Password"
          required
        />
        <Button className="w-full" disabled={loading} type="submit">
          Continue with Email
        </Button>
      </form>
      <Button className="w-full" variant="secondary" disabled={loading} onClick={onGoogleLogin} type="button">
        Continue with Google
      </Button>
      {error && <p className="text-sm text-red-500">{error}</p>}
    </Card>
  );
}
