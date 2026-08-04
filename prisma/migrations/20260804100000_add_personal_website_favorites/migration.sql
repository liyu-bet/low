-- AlterTable
ALTER TABLE "Website" ADD COLUMN "statusBeforeArchive" "WebsiteStatus",
ADD COLUMN "lifecycleStageBeforeArchive" "LifecycleStage";

-- CreateTable
CREATE TABLE "WebsiteFavorite" (
    "userId" TEXT NOT NULL,
    "websiteId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WebsiteFavorite_pkey" PRIMARY KEY ("userId","websiteId")
);

-- CreateIndex
CREATE INDEX "WebsiteFavorite_websiteId_idx" ON "WebsiteFavorite"("websiteId");

-- CreateIndex
CREATE INDEX "WebsiteFavorite_userId_createdAt_idx" ON "WebsiteFavorite"("userId", "createdAt");

-- AddForeignKey
ALTER TABLE "WebsiteFavorite" ADD CONSTRAINT "WebsiteFavorite_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WebsiteFavorite" ADD CONSTRAINT "WebsiteFavorite_websiteId_fkey" FOREIGN KEY ("websiteId") REFERENCES "Website"("id") ON DELETE CASCADE ON UPDATE CASCADE;
