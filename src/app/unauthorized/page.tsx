import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function UnauthorizedPage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-3xl items-center px-6">
      <Card className="w-full space-y-4">
        <h1 className="text-2xl font-semibold">Unauthorized</h1>
        <p className="text-zinc-600 dark:text-zinc-300">
          Your account does not have access to this page.
        </p>
        <Link href="/dashboard">
          <Button>Back to dashboard</Button>
        </Link>
      </Card>
    </main>
  );
}
