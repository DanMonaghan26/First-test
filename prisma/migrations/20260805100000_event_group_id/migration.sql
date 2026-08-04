-- AlterTable
ALTER TABLE "Event" ADD COLUMN     "eventGroupId" TEXT;

-- CreateIndex
CREATE INDEX "Event_eventGroupId_idx" ON "Event"("eventGroupId");

