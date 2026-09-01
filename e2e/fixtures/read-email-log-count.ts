// Test-only, read-only helper: prints the count of EmailLog rows sent to the
// given address. The console email provider never prints a message body, so
// this DB count — not the email content — is how a test confirms an email
// send actually happened (e.g. requestOrderRecovery's generic on-screen
// message is shown whether or not a match was found).
import "dotenv/config";
import { PrismaClient } from "../../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

async function main() {
  const email = process.argv[2];
  if (!email) throw new Error("Usage: tsx read-email-log-count.ts <email>");

  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
  const prisma = new PrismaClient({ adapter });

  const count = await prisma.emailLog.count({ where: { toEmail: email, status: "SENT" } });

  await prisma.$disconnect();
  process.stdout.write(String(count));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
