-- CreateTable
CREATE TABLE "DiaryEntry" (
    "id" TEXT NOT NULL,
    "entryDate" TIMESTAMP(3) NOT NULL,
    "content" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "ownerId" TEXT NOT NULL,

    CONSTRAINT "DiaryEntry_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DiaryEntry_ownerId_entryDate_idx" ON "DiaryEntry"("ownerId", "entryDate");

-- CreateIndex
CREATE UNIQUE INDEX "DiaryEntry_ownerId_entryDate_key" ON "DiaryEntry"("ownerId", "entryDate");

-- AddForeignKey
ALTER TABLE "DiaryEntry" ADD CONSTRAINT "DiaryEntry_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
