import { NextRequest, NextResponse } from "next/server";
import { decryptSession, SESSION_COOKIE_NAME } from "@/lib/session";
import { REF_COOKIE_MAX_AGE_SECONDS, REF_COOKIE_NAME } from "@/lib/affiliate-constants";

const AUTH_ONLY_ROUTES = ["/login", "/signup"];
const PROTECTED_PREFIXES = ["/dashboard", "/admin", "/onboarding"];

// Optimistic, cookie-only check — the source of truth (tokenVersion revocation,
// role, onboarding state) is re-verified server-side in the DAL (see src/lib/dal.ts).
export default async function proxy(request: NextRequest) {
  const { pathname, searchParams } = request.nextUrl;
  const isProtected = PROTECTED_PREFIXES.some((prefix) => pathname.startsWith(prefix));
  const isAuthOnly = AUTH_ONLY_ROUTES.includes(pathname);

  let response: NextResponse;

  if (!isProtected && !isAuthOnly) {
    response = NextResponse.next();
  } else {
    const session = await decryptSession(request.cookies.get(SESSION_COOKIE_NAME)?.value);

    if (isProtected && !session) {
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("next", pathname);
      response = NextResponse.redirect(loginUrl);
    } else if (isAuthOnly && session) {
      const destination = session.role === "ADMIN" ? "/admin" : "/dashboard";
      response = NextResponse.redirect(new URL(destination, request.url));
    } else {
      response = NextResponse.next();
    }
  }

  // Affiliate attribution: a raw, unvalidated code from the URL — startCheckout
  // is what actually looks it up against a real, active Affiliate row. Storing
  // it here (rather than in the checkout form) means the buyer doesn't lose
  // attribution just because they landed on the product page today and bought
  // next week.
  const ref = searchParams.get("ref");
  if (ref) {
    response.cookies.set(REF_COOKIE_NAME, ref.slice(0, 40), {
      maxAge: REF_COOKIE_MAX_AGE_SECONDS,
      httpOnly: true,
      sameSite: "lax",
      path: "/",
    });
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|svg|webp)$).*)"],
};
