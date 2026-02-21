-- AlterTable
ALTER TABLE "Block" ADD COLUMN     "tags" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- AlterTable
ALTER TABLE "Page" ADD COLUMN     "tags" TEXT[] DEFAULT ARRAY[]::TEXT[];
