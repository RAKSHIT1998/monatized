// Test-only helper: generates a real password-reset token pair (same
// randomBytes+sha256 logic as src/lib/password.ts's generatePasswordResetToken,
// reimplemented here since that file starts with `import "server-only"`) and
// writes the hash to the DB for the given user, bypassing only the "email
// delivery" step — the raw token is printed to stdout so the calling test can
// use it exactly as a real user clicking the emailed link would.
import "dotenv/config";
import { randomBytes, createHash } from "node:crypto";
import { PrismaClient } from "../../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

async function main() {
  const email = process.argv[2];
  if (!email) throw new Error("Usage: tsx create-password-reset-token.ts <email>");

  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
  const prisma = new PrismaClient({ adapter });

  const token = randomBytes(32).toString("base64url");
  const tokenHash = createHash("sha256").update(token).digest("hex");

  await prisma.user.update({
    where: { email },
    data: {
      passwordResetTokenHash: tokenHash,
      passwordResetTokenExpiresAt: new Date(Date.now() + 60 * 60 * 1000),
    },
  });

  await prisma.$disconnect();
  process.stdout.write(token);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
