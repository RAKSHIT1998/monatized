-- CreateEnum
CREATE TYPE "AutomationTrigger" AS ENUM ('ORDER_PAID', 'NEW_SUBSCRIBER', 'SUBSCRIPTION_CANCELLED');

-- CreateEnum
CREATE TYPE "AutomationActionType" AS ENUM ('ADD_CUSTOMER_TAG', 'SEND_EMAIL');

-- CreateTable
CREATE TABLE "Automation" (
    "id" TEXT NOT NULL,
    "creatorProfileId" TEXT NOT NULL,
    "trigger" "AutomationTrigger" NOT NULL,
    "actionType" "AutomationActionType" NOT NULL,
    "actionConfig" JSONB NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "runCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Automation_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Automation" ADD CONSTRAINT "Automation_creatorProfileId_fkey" FOREIGN KEY ("creatorProfileId") REFERENCES "CreatorProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
