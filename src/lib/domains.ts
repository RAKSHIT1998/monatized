import "server-only";
import { resolveTxt } from "node:dns/promises";
import { randomBytes } from "node:crypto";

export function generateDomainVerificationToken() {
  return `monetized-verify-${randomBytes(12).toString("hex")}`;
}

export function verificationRecordName(domain: string) {
  return `_monetized-verify.${domain}`;
}

/**
 * Proves domain ownership via a DNS TXT record — it does NOT prove traffic is
 * actually routed here yet. That's a separate CNAME/A-record step the creator
 * does with their DNS provider once verified, pointed at this app's own host.
 */
export async function verifyDomainOwnership(domain: string, expectedToken: string): Promise<boolean> {
  try {
    const records = await resolveTxt(verificationRecordName(domain));
    return records.some((chunks) => chunks.join("").trim() === expectedToken);
  } catch {
    return false; // NXDOMAIN / no TXT record / DNS error — just "not verified yet"
  }
}
