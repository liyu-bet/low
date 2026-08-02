-- AlterEnum
ALTER TYPE "SyncRunStatus" ADD VALUE 'PARTIAL';

-- AlterTable
ALTER TABLE "SyncRun" ADD COLUMN     "createdCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "errorCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "jobType" TEXT,
ADD COLUMN     "processed" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "updatedCount" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "WebsiteIntegration" ADD COLUMN     "externalData" JSONB;

-- CreateIndex
CREATE INDEX "SyncRun_jobType_idx" ON "SyncRun"("jobType");
