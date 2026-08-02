-- CreateEnum
CREATE TYPE "TaskStatus" AS ENUM ('TODO', 'IN_PROGRESS', 'DONE', 'CANCELED');

-- CreateEnum
CREATE TYPE "TaskPriority" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');

-- CreateTable
CREATE TABLE "WebsiteTask" (
    "id" TEXT NOT NULL,
    "websiteId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "priority" "TaskPriority" NOT NULL DEFAULT 'MEDIUM',
    "status" "TaskStatus" NOT NULL DEFAULT 'TODO',
    "dueAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "result" TEXT,
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WebsiteTask_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "WebsiteTask_websiteId_status_idx" ON "WebsiteTask"("websiteId", "status");

-- CreateIndex
CREATE INDEX "WebsiteTask_status_dueAt_idx" ON "WebsiteTask"("status", "dueAt");

-- CreateIndex
CREATE INDEX "WebsiteTask_priority_idx" ON "WebsiteTask"("priority");

-- CreateIndex
CREATE INDEX "WebsiteTask_createdAt_idx" ON "WebsiteTask"("createdAt");

-- AddForeignKey
ALTER TABLE "WebsiteTask" ADD CONSTRAINT "WebsiteTask_websiteId_fkey" FOREIGN KEY ("websiteId") REFERENCES "Website"("id") ON DELETE CASCADE ON UPDATE CASCADE;
