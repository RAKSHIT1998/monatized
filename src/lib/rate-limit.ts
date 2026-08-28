import "server-only";
import { headers } from "next/headers";

export { checkRateLimit, formatRetryAfter } from "./rate-limit-core";
export type { RateLimitResult } from "./rate-limit-core";

// Best-effort client IP from the standard reverse-proxy header. There's no
// proxy in front of local dev, so this is usually "unknown" there — rate
// limiting still works via the per-identifier (e.g. per-email) key in that
// case, just without the IP-based defense-in-depth layer.
export async function getClientIp(): Promise<string> {
  const headerList = await headers();
  const forwardedFor = headerList.get("x-forwarded-for");
  if (forwardedFor) return forwardedFor.split(",")[0].trim();

  const realIp = headerList.get("x-real-ip");
  if (realIp) return realIp.trim();

  return "unknown";
}
