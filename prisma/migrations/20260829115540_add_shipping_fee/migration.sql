-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "shippingFeeAmountMinor" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "shippingFeeMinor" INTEGER;
