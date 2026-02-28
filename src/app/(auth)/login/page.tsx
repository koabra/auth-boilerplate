import Link from "next/link";
import { LoginForm } from "@/components/auth/login-form";

export default function LoginPage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-4xl items-center justify-center px-6 py-12">
      <div className="w-full max-w-md space-y-4">
        <LoginForm />
        <p className="text-center text-sm text-[var(--muted-foreground)]">
          No account?{" "}
          <Link className="underline" href="/register">
            Create one
          </Link>
        </p>
      </div>
    </main>
  );
}
