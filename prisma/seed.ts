import "dotenv/config";
import bcrypt from "bcryptjs";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

const plans = [
  {
    key: "FREE" as const,
    name: "Free",
    priceMonthlyMinor: 0,
    currency: "INR",
    productLimit: 3,
    removesBranding: false,
    platformFeeBps: 0,
    features: ["Basic storefront", "3 products", "Basic analytics"],
  },
  {
    key: "CREATOR" as const,
    name: "Creator",
    priceMonthlyMinor: 49900,
    currency: "INR",
    productLimit: null,
    removesBranding: true,
    platformFeeBps: 0,
    features: [
      "Unlimited products",
      "Remove Monetized branding",
      "Advanced analytics",
      "Coupons",
    ],
  },
  {
    key: "PRO" as const,
    name: "Pro",
    priceMonthlyMinor: 149900,
    currency: "INR",
    productLimit: null,
    removesBranding: true,
    platformFeeBps: 0,
    features: [
      "Everything in Creator",
      "AI Growth Agent",
      "Automations",
      "Advanced CRM",
      "Custom domain",
    ],
  },
  {
    key: "BUSINESS" as const,
    name: "Business",
    priceMonthlyMinor: 499900,
    currency: "INR",
    productLimit: null,
    removesBranding: true,
    platformFeeBps: 0,
    features: ["Teams", "API access", "Webhooks", "Priority support"],
  },
];

async function main() {
  for (const plan of plans) {
    await prisma.plan.upsert({
      where: { key: plan.key },
      create: plan,
      update: plan,
    });
  }
  console.log(`Seeded ${plans.length} plans.`);

  const adminEmail = process.env.ADMIN_SEED_EMAIL || "admin@monetized.local";
  const existingAdmin = await prisma.user.findUnique({ where: { email: adminEmail } });
  if (!existingAdmin) {
    const adminPassword = process.env.ADMIN_SEED_PASSWORD || "ChangeMe123!";
    await prisma.user.create({
      data: {
        email: adminEmail,
        name: "Admin",
        role: "ADMIN",
        passwordHash: await bcrypt.hash(adminPassword, 12),
      },
    });
    console.log(
      `Created dev admin user ${adminEmail} / ${adminPassword} — change this password before deploying anywhere real.`,
    );
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
