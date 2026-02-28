import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function Home() {
  return (
    <main className="mx-auto flex min-h-screen max-w-4xl items-center px-6 py-12">
      <Card className="w-full space-y-6">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold">Auth Boilerplate</h1>
          <p className="text-zinc-600 dark:text-zinc-300">
            Firebase auth, RBAC, comments, analytics, and admin controls in one starter.
          </p>
        </div>
        <div className="flex gap-3">
          <Link href="/login">
            <Button>Login</Button>
          </Link>
          <Link href="/register">
            <Button variant="outline">Register</Button>
          </Link>
          <Link href="/dashboard">
            <Button variant="secondary">Dashboard</Button>
          </Link>
        </div>
      </Card>
    </main>
  );
}
