
-- AlterTable
ALTER TABLE "User" ADD COLUMN     "sortOrder" INTEGER NOT NULL DEFAULT 0;

-- Backfill: preserve everyone's current display order (previously implied
-- by createdAt) as their initial sortOrder, instead of collapsing everyone
-- to 0.
UPDATE "User" AS u
SET "sortOrder" = ranked.rn
FROM (
  SELECT "id", ROW_NUMBER() OVER (ORDER BY "createdAt" ASC) - 1 AS rn
  FROM "User"
) AS ranked
WHERE u."id" = ranked."id";

