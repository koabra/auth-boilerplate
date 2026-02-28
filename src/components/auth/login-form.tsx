"use client";

import { useCallback, useEffect, useState } from "react";
import {
  getRedirectResult,
  GoogleAuthProvider,
  signInWithEmailAndPassword,
  signInWithPopup,
  signInWithRedirect,
  signOut,
} from "firebase/auth";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/providers/auth-provider";
import { getFirebaseAuthClient } from "@/lib/firebase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";

export function LoginForm() {
  const router = useRouter();
  const { refresh } = useAuth();
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

  const createServerSession = useCallback(async () => {
    const firebaseAuth = getFirebaseAuthClient();
    const firebaseUser = firebaseAuth.currentUser;
    if (!firebaseUser) return;
    const idToken = await firebaseUser.getIdToken();
    const response = await fetch("/api/auth/session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ idToken }),
    });
    if (!response.ok) {
      const message = await toErrorMessage(response);
      if (message.includes("verify your email") || message.includes("disabled")) {
        await signOut(firebaseAuth);
      }
      throw new Error(message);
    }
    await refresh();
    router.replace("/dashboard");
    router.refresh();
  }, [refresh, router]);

  const isMobileBrowser = () => {
    if (typeof navigator === "undefined") return false;
    return /android|iphone|ipad|ipod|mobile/i.test(navigator.userAgent);
  };

  useEffect(() => {
    const finalizeRedirectSignIn = async () => {
      setLoading(true);
      try {
        const firebaseAuth = getFirebaseAuthClient();
        const result = await getRedirectResult(firebaseAuth);
        if (result?.user) {
          await createServerSession();
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Google sign-in failed");
      } finally {
        setLoading(false);
      }
    };
    void finalizeRedirectSignIn();
  }, [createServerSession]);

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
      const provider = new GoogleAuthProvider();
      if (isMobileBrowser()) {
        await signInWithRedirect(firebaseAuth, provider);
        return;
      }
      await signInWithPopup(firebaseAuth, provider);
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
        <Button className="w-full" data-track="auth.login.email.submit" disabled={loading} type="submit">
          Continue with Email
        </Button>
      </form>
      <Button
        className="w-full"
        data-track="auth.login.google.submit"
        variant="secondary"
        disabled={loading}
        onClick={onGoogleLogin}
        type="button"
      >
        Continue with Google
      </Button>
      {error && <p className="text-sm text-red-500">{error}</p>}
    </Card>
  );
}
