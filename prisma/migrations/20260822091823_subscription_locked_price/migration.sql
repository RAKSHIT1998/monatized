/*
  Warnings:

  - Added the required column `billingInterval` to the `Subscription` table without a default value. This is not possible if the table is not empty.
  - Added the required column `currency` to the `Subscription` table without a default value. This is not possible if the table is not empty.
  - Added the required column `unitAmountMinor` to the `Subscription` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Subscription" ADD COLUMN     "billingInterval" "BillingInterval" NOT NULL,
ADD COLUMN     "currency" TEXT NOT NULL,
ADD COLUMN     "unitAmountMinor" INTEGER NOT NULL;
