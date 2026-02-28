"use client";

import { useRouter } from "next/navigation";
import { signOut as firebaseSignOut } from "firebase/auth";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/components/providers/auth-provider";
import { getFirebaseAuthClient } from "@/lib/firebase/client";

export function UserMenu() {
  const router = useRouter();
  const { user, refresh } = useAuth();

  const signOut = async () => {
    await Promise.allSettled([
      fetch("/api/auth/session", { method: "DELETE" }),
      firebaseSignOut(getFirebaseAuthClient()),
    ]);
    await refresh();
    router.replace("/login");
    router.refresh();
  };

  if (!user) return null;

  return (
    <div className="flex items-center gap-3">
      <div className="text-right">
        <p className="text-sm font-medium">@{user.pseudonym}</p>
        <p className="text-xs text-[var(--muted-foreground)]">{user.roles.join(", ")}</p>
      </div>
      <Button onClick={signOut} size="sm" variant="outline">
        Sign out
      </Button>
    </div>
  );
}
