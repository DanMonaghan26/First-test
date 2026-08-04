-- CreateEnum
CREATE TYPE "RecurrenceType" AS ENUM ('NONE', 'DAILY', 'WEEKLY', 'CUSTOM_DAYS');

-- AlterTable
ALTER TABLE "Event" ADD COLUMN     "recurrenceDays" INTEGER[] DEFAULT ARRAY[]::INTEGER[],
ADD COLUMN     "recurrenceEndDate" TIMESTAMP(3),
ADD COLUMN     "recurrenceType" "RecurrenceType" NOT NULL DEFAULT 'NONE';
