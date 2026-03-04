import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function Home() {
  return (
    <main className="mx-auto flex min-h-screen max-w-4xl items-center px-6 py-12">
      <Card className="w-full space-y-6">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold">Auth Boilerplate</h1>
          <p className="text-[var(--muted-foreground)]">
            Firebase auth, RBAC, comments, analytics, and admin controls in one starter.
          </p>
        </div>
        <div className="flex gap-3">
          <Link href="/login">
            <Button data-track="home.login">Login</Button>
          </Link>
          <Link href="/register">
            <Button data-track="home.register" variant="outline">
              Register
            </Button>
          </Link>
          <Link href="/dashboard">
            <Button data-track="home.dashboard" variant="secondary">
              Dashboard
            </Button>
          </Link>
          <Link href="/pricing">
            <Button data-track="home.pricing" variant="outline">
              Pricing
            </Button>
          </Link>
        </div>
      </Card>
    </main>
  );
}
