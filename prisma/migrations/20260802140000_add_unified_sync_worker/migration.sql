-- AlterEnum
ALTER TYPE "SyncRunStatus" ADD VALUE IF NOT EXISTS 'SKIPPED';

-- AlterTable
ALTER TABLE "SyncRun" ADD COLUMN IF NOT EXISTS "trigger" TEXT;

-- CreateIndex
CREATE INDEX IF NOT EXISTS "SyncRun_trigger_startedAt_idx" ON "SyncRun"("trigger", "startedAt");

-- CreateTable
CREATE TABLE IF NOT EXISTS "WorkerHeartbeat" (
    "id" TEXT NOT NULL,
    "workerId" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastHeartbeatAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "currentJob" TEXT,
    "lastError" TEXT,
    "version" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WorkerHeartbeat_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "WorkerHeartbeat_workerId_key" ON "WorkerHeartbeat"("workerId");
CREATE INDEX IF NOT EXISTS "WorkerHeartbeat_lastHeartbeatAt_idx" ON "WorkerHeartbeat"("lastHeartbeatAt");
CREATE INDEX IF NOT EXISTS "WorkerHeartbeat_status_idx" ON "WorkerHeartbeat"("status");
