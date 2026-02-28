import { NextResponse } from "next/server";
import { z } from "zod";
import { withPermission } from "@/lib/auth";
import { getFirebaseAdminAuth } from "@/lib/firebase/admin";

const bodySchema = z.object({
  idToken: z.string().min(10).optional(),
  resetEmail: z.string().email().optional(),
});

type CheckResult = {
  ok: boolean;
  message: string;
  details?: string;
};

function toErrorMessage(error: unknown) {
  if (error instanceof Error) return error.message;
  return "Unknown error";
}

export const POST = withPermission("settings", "manage", async ({ req, session }) => {
  try {
    const body = bodySchema.parse(await req.json());
    const adminAuth = getFirebaseAdminAuth();

    const verifyCheck: CheckResult = {
      ok: true,
      message: "Skipped. Pass idToken in request body to run verifyIdToken check.",
    };

    if (body.idToken) {
      try {
        await adminAuth.verifyIdToken(body.idToken);
        verifyCheck.ok = true;
        verifyCheck.message = "verifyIdToken succeeded.";
      } catch (error) {
        verifyCheck.ok = false;
        verifyCheck.message = "verifyIdToken failed.";
        verifyCheck.details = toErrorMessage(error);
      }
    }

    const resetEmail = body.resetEmail ?? session.email;
    const resetCheck: CheckResult = {
      ok: true,
      message: `generatePasswordResetLink succeeded for ${resetEmail}.`,
    };

    try {
      await adminAuth.generatePasswordResetLink(resetEmail);
    } catch (error) {
      resetCheck.ok = false;
      resetCheck.message = `generatePasswordResetLink failed for ${resetEmail}.`;
      resetCheck.details = toErrorMessage(error);
    }

    return NextResponse.json({
      ok: verifyCheck.ok && resetCheck.ok,
      checks: {
        verifyIdToken: verifyCheck,
        generatePasswordResetLink: resetCheck,
      },
    });
  } catch (error) {
    const message = toErrorMessage(error);
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0]?.message ?? "Invalid payload" }, { status: 400 });
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
});
