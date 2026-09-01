// Test-only helper: creates a real paid Order (Customer, Order, OrderItem,
// and a succeeded MOCK Payment) directly in the DB for an existing product,
// bypassing a full checkout run through the browser. Used only where
// checkout itself isn't what's being tested (e.g. an admin-refund spec) —
// the real checkout flow already has thorough coverage of its own in
// checkout.spec.ts/cart.spec.ts/refunds.spec.ts. Prints the order number.
import "dotenv/config";
import { randomBytes } from "node:crypto";
import { PrismaClient } from "../../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

function generateOrderNumber() {
  return `MON-${Date.now().toString(36).toUpperCase()}-${randomBytes(3).toString("hex").toUpperCase()}`;
}

async function main() {
  const [username, productSlug, buyerEmail] = process.argv.slice(2);
  if (!username || !productSlug || !buyerEmail) {
    throw new Error("Usage: tsx create-paid-order.ts <username> <productSlug> <buyerEmail>");
  }

  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
  const prisma = new PrismaClient({ adapter });

  const creator = await prisma.creatorProfile.findUniqueOrThrow({ where: { username } });
  const product = await prisma.product.findFirstOrThrow({
    where: { slug: productSlug, creatorProfileId: creator.id },
  });

  const customer = await prisma.customer.upsert({
    where: { creatorProfileId_email: { creatorProfileId: creator.id, email: buyerEmail } },
    create: {
      creatorProfileId: creator.id,
      email: buyerEmail,
      totalSpentMinor: product.priceAmountMinor,
      ordersCount: 1,
    },
    update: { totalSpentMinor: { increment: product.priceAmountMinor }, ordersCount: { increment: 1 } },
  });

  const orderNumber = generateOrderNumber();
  await prisma.order.create({
    data: {
      orderNumber,
      creatorProfileId: creator.id,
      customerId: customer.id,
      status: "PAID",
      currency: product.currency,
      subtotalAmountMinor: product.priceAmountMinor,
      totalAmountMinor: product.priceAmountMinor,
      items: {
        create: {
          productId: product.id,
          titleSnapshot: product.title,
          priceAmountMinorSnapshot: product.priceAmountMinor,
          quantity: 1,
        },
      },
      payment: {
        create: {
          provider: "MOCK",
          status: "SUCCEEDED",
          providerPaymentId: `mock_fixture_${orderNumber}`,
          amountMinor: product.priceAmountMinor,
          currency: product.currency,
        },
      },
    },
  });

  await prisma.$disconnect();
  process.stdout.write(orderNumber);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
