import { NextRequest, NextResponse } from "next/server";
import { getSessionCookieName, verifySessionToken } from "@/lib/session";
import { hasPermission } from "@/lib/permissions";

export type RequestContext = {
  req: NextRequest;
  session: {
    userId: string;
    firebaseUid: string;
    email: string;
    roles: string[];
  };
};

export async function getRequestSession(req: NextRequest) {
  const token = req.cookies.get(getSessionCookieName())?.value;
  if (!token) return null;
  return verifySessionToken(token);
}

export function withAuth(
  handler: (context: RequestContext) => Promise<NextResponse>,
) {
  return async (req: NextRequest) => {
    const session = await getRequestSession(req);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return handler({ req, session });
  };
}

export function withPermission(
  resource: string,
  action: string,
  handler: (context: RequestContext) => Promise<NextResponse>,
) {
  return withAuth(async (context) => {
    const permitted = await hasPermission(context.session.userId, resource, action);
    if (!permitted) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    return handler(context);
  });
}
