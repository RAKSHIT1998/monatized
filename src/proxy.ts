import { NextRequest, NextResponse } from "next/server";
import { decryptSession, SESSION_COOKIE_NAME } from "@/lib/session";

const AUTH_ONLY_ROUTES = ["/login", "/signup"];
const PROTECTED_PREFIXES = ["/dashboard", "/admin", "/onboarding"];

// Optimistic, cookie-only check — the source of truth (tokenVersion revocation,
// role, onboarding state) is re-verified server-side in the DAL (see src/lib/dal.ts).
export default async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isProtected = PROTECTED_PREFIXES.some((prefix) => pathname.startsWith(prefix));
  const isAuthOnly = AUTH_ONLY_ROUTES.includes(pathname);

  if (!isProtected && !isAuthOnly) {
    return NextResponse.next();
  }

  const session = await decryptSession(request.cookies.get(SESSION_COOKIE_NAME)?.value);

  if (isProtected && !session) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (isAuthOnly && session) {
    const destination = session.role === "ADMIN" ? "/admin" : "/dashboard";
    return NextResponse.redirect(new URL(destination, request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|svg|webp)$).*)"],
};
