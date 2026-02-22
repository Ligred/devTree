-- CreateTable
CREATE TABLE "ExcalidrawLibrary" (
    "id" TEXT NOT NULL,
    "sourceUrl" TEXT NOT NULL,
    "name" TEXT NOT NULL DEFAULT '',
    "items" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ExcalidrawLibrary_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserLibrary" (
    "userId" TEXT NOT NULL,
    "libraryId" TEXT NOT NULL,
    "addedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserLibrary_pkey" PRIMARY KEY ("userId","libraryId")
);

-- CreateIndex
CREATE UNIQUE INDEX "ExcalidrawLibrary_sourceUrl_key" ON "ExcalidrawLibrary"("sourceUrl");

-- AddForeignKey
ALTER TABLE "UserLibrary" ADD CONSTRAINT "UserLibrary_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserLibrary" ADD CONSTRAINT "UserLibrary_libraryId_fkey" FOREIGN KEY ("libraryId") REFERENCES "ExcalidrawLibrary"("id") ON DELETE CASCADE ON UPDATE CASCADE;
