// Test-only helper: moves a creator to the Pro plan directly in the DB, so
// E2E specs for Pro-gated features (Automations, Custom domain, Growth
// engine) don't need a real upgrade flow. Run via `npx tsx` rather than
// imported in-process — see mark-domain-verified.ts for why.
import "dotenv/config";
import { PrismaClient } from "../../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

async function main() {
  const username = process.argv[2];
  if (!username) throw new Error("Usage: tsx upgrade-to-pro.ts <username>");

  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
  const prisma = new PrismaClient({ adapter });

  const proPlan = await prisma.plan.findUniqueOrThrow({ where: { key: "PRO" } });
  await prisma.creatorProfile.update({
    where: { username },
    data: { planId: proPlan.id },
  });

  await prisma.$disconnect();
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
