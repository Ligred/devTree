-- CreateTable
CREATE TABLE "DiaryTemplate" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "journalId" TEXT NOT NULL,

    CONSTRAINT "DiaryTemplate_pkey" PRIMARY KEY ("id")
);

-- Create indexes and uniqueness
CREATE INDEX "DiaryTemplate_journalId_createdAt_idx" ON "DiaryTemplate"("journalId", "createdAt");
CREATE UNIQUE INDEX "DiaryTemplate_journalId_name_key" ON "DiaryTemplate"("journalId", "name");

-- Foreign key
ALTER TABLE "DiaryTemplate"
ADD CONSTRAINT "DiaryTemplate_journalId_fkey"
FOREIGN KEY ("journalId") REFERENCES "DiaryJournal"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Backfill a default template for existing journals
INSERT INTO "DiaryTemplate" ("id", "name", "body", "createdAt", "updatedAt", "journalId")
SELECT
    ('dt_' || substr(md5(random()::text || clock_timestamp()::text || j."id"), 1, 24)),
    'Daily Reflection',
    '## Daily Reflection\n\n### How was my day?\n\n### What did I learn?\n\n### What should I focus on next?',
    NOW(),
    NOW(),
    j."id"
FROM "DiaryJournal" j
LEFT JOIN "DiaryTemplate" t
    ON t."journalId" = j."id" AND t."name" = 'Daily Reflection'
WHERE t."id" IS NULL;
