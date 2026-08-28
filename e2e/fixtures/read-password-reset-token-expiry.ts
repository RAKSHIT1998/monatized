// Test-only, read-only helper: prints the user's current
// passwordResetTokenExpiresAt (or the literal string "null"). Used to detect
// whether a requestPasswordReset call actually issued a new token — the
// action deliberately returns the same generic message whether or not it
// was rate-limited (see requestPasswordReset's anti-enumeration comment), so
// this DB value is the only externally-observable signal that a call was a
// no-op.
import "dotenv/config";
import { PrismaClient } from "../../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

async function main() {
  const email = process.argv[2];
  if (!email) throw new Error("Usage: tsx read-password-reset-token-expiry.ts <email>");

  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
  const prisma = new PrismaClient({ adapter });

  const user = await prisma.user.findUniqueOrThrow({
    where: { email },
    select: { passwordResetTokenExpiresAt: true },
  });

  await prisma.$disconnect();
  process.stdout.write(user.passwordResetTokenExpiresAt?.toISOString() ?? "null");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
