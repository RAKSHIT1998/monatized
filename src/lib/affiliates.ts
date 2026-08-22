import "server-only";
import { randomBytes } from "node:crypto";
import { db } from "@/lib/db";

export function generateAffiliateAccessToken() {
  return randomBytes(24).toString("base64url");
}

export function calculateCommissionMinor(totalAmountMinor: number, commissionBps: number) {
  return Math.round((totalAmountMinor * commissionBps) / 10_000);
}

export async function findActiveAffiliateByCode(creatorProfileId: string, rawCode: string) {
  const code = rawCode.trim().toUpperCase();
  if (!code) return null;

  return db.affiliate.findFirst({
    where: { creatorProfileId, code, isActive: true },
  });
}
