-- AlterTable
ALTER TABLE "Event" ADD COLUMN     "batchId" TEXT;

-- CreateIndex
CREATE INDEX "Event_createdById_subscriptionId_createdAt_idx" ON "Event"("createdById", "subscriptionId", "createdAt");

-- CreateIndex
CREATE INDEX "Event_batchId_idx" ON "Event"("batchId");

