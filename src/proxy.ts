import { NextResponse, type NextRequest } from "next/server";
import { getSessionCookieName, verifySessionToken } from "@/lib/session";

const publicPaths = ["/", "/login", "/register"];
const adminPrefix = "/dashboard/admin";
const protectedPrefix = "/dashboard";

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const token = req.cookies.get(getSessionCookieName())?.value;
  const session = token ? await verifySessionToken(token) : null;

  const isPublic = publicPaths.some((path) => pathname === path || pathname.startsWith(`${path}/`));

  if (isPublic && session && (pathname === "/login" || pathname === "/register")) {
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }

  if (pathname.startsWith(protectedPrefix) && !session) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  if (pathname.startsWith(adminPrefix) && session) {
    const isAdmin = session.roles.includes("admin") || session.roles.includes("super_user");
    if (!isAdmin) {
      return NextResponse.redirect(new URL("/unauthorized", req.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
