-- CreateEnum
CREATE TYPE "FulfillmentStatus" AS ENUM ('NOT_APPLICABLE', 'UNFULFILLED', 'SHIPPED');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "ProductType" ADD VALUE 'PHYSICAL';
ALTER TYPE "ProductType" ADD VALUE 'TIP';

-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "buyerNote" TEXT,
ADD COLUMN     "fulfillmentStatus" "FulfillmentStatus" NOT NULL DEFAULT 'NOT_APPLICABLE',
ADD COLUMN     "shippedAt" TIMESTAMP(3),
ADD COLUMN     "shippingAddress" JSONB,
ADD COLUMN     "trackingNumber" TEXT;

-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "stockQuantity" INTEGER;
