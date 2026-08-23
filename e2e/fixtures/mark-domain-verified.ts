// Test-only helper: flips a CustomDomain to VERIFIED directly in the DB.
// Run via `npx tsx` (same mechanism prisma/seed.ts uses) rather than imported
// in-process, since src/lib/db.ts starts with `import "server-only"`, which
// throws unconditionally outside Next's own bundler. Structured like
// seed.ts (an async main(), never top-level awaited) since tsx transforms
// this to CJS output, which rejects top-level await.
import "dotenv/config";
import { PrismaClient } from "../../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

async function main() {
  const domain = process.argv[2];
  if (!domain) throw new Error("Usage: tsx mark-domain-verified.ts <domain>");

  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
  const prisma = new PrismaClient({ adapter });

  await prisma.customDomain.update({
    where: { domain },
    data: { status: "VERIFIED", verifiedAt: new Date() },
  });

  await prisma.$disconnect();
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
