-- AlterTable
ALTER TABLE "User" ADD COLUMN     "localLibraryItems" JSONB NOT NULL DEFAULT '[]';
