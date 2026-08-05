
-- AlterTable
ALTER TABLE "Event" ADD COLUMN     "deleteBatchId" TEXT,
ADD COLUMN     "deletedAt" TIMESTAMP(3),
ADD COLUMN     "deletedById" TEXT;

-- CreateIndex
CREATE INDEX "Event_deleteBatchId_idx" ON "Event"("deleteBatchId");

-- CreateIndex
CREATE INDEX "Event_deletedAt_idx" ON "Event"("deletedAt");

-- AddForeignKey
ALTER TABLE "Event" ADD CONSTRAINT "Event_deletedById_fkey" FOREIGN KEY ("deletedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

