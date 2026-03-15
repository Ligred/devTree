-- CreateTable
CREATE TABLE "DiaryJournal" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "ownerId" TEXT NOT NULL,

    CONSTRAINT "DiaryJournal_pkey" PRIMARY KEY ("id")
);

-- Create indexes and uniqueness
CREATE INDEX "DiaryJournal_ownerId_updatedAt_idx" ON "DiaryJournal"("ownerId", "updatedAt");
CREATE UNIQUE INDEX "DiaryJournal_ownerId_name_key" ON "DiaryJournal"("ownerId", "name");

-- Add columns to DiaryEntry
ALTER TABLE "DiaryEntry"
ADD COLUMN "locationShort" TEXT,
ADD COLUMN "journalId" TEXT;

-- Create one default journal per user who has diary entries
INSERT INTO "DiaryJournal" ("id", "name", "createdAt", "updatedAt", "ownerId")
SELECT ('j_' || substr(md5(random()::text || clock_timestamp()::text || "ownerId"), 1, 24)), 'main', NOW(), NOW(), "ownerId"
FROM (
  SELECT DISTINCT "ownerId" FROM "DiaryEntry"
) AS owners;

-- Attach existing entries to the newly created main journal
UPDATE "DiaryEntry" d
SET "journalId" = j."id"
FROM "DiaryJournal" j
WHERE j."ownerId" = d."ownerId" AND j."name" = 'main';

-- journalId must be required after backfill
ALTER TABLE "DiaryEntry"
ALTER COLUMN "journalId" SET NOT NULL;

-- Replace old uniqueness with journal-scoped uniqueness
DROP INDEX IF EXISTS "DiaryEntry_ownerId_entryDate_key";
DROP INDEX IF EXISTS "DiaryEntry_ownerId_entryDate_idx";

CREATE UNIQUE INDEX "DiaryEntry_ownerId_journalId_entryDate_key"
ON "DiaryEntry"("ownerId", "journalId", "entryDate");

CREATE INDEX "DiaryEntry_ownerId_journalId_entryDate_idx"
ON "DiaryEntry"("ownerId", "journalId", "entryDate");

-- Foreign keys
ALTER TABLE "DiaryJournal"
ADD CONSTRAINT "DiaryJournal_ownerId_fkey"
FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "DiaryEntry"
ADD CONSTRAINT "DiaryEntry_journalId_fkey"
FOREIGN KEY ("journalId") REFERENCES "DiaryJournal"("id") ON DELETE CASCADE ON UPDATE CASCADE;
