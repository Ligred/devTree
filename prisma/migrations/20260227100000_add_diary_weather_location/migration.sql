-- AlterTable
ALTER TABLE "DiaryEntry"
ADD COLUMN "weatherTempC" DOUBLE PRECISION,
ADD COLUMN "weatherCode" INTEGER,
ADD COLUMN "weatherLabel" TEXT,
ADD COLUMN "locationName" TEXT,
ADD COLUMN "locationLat" DOUBLE PRECISION,
ADD COLUMN "locationLon" DOUBLE PRECISION;

-- CreateIndex
CREATE INDEX "DiaryEntry_locationLat_locationLon_idx" ON "DiaryEntry"("locationLat", "locationLon");
