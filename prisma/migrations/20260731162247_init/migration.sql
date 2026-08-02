-- CreateEnum
CREATE TYPE "WebsiteStatus" AS ENUM ('DRAFT', 'ACTIVE', 'PAUSED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "LifecycleStage" AS ENUM ('IDEA', 'SETUP', 'LAUNCHED', 'INDEXING', 'GROWING', 'MATURE', 'DECLINING', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "DateSource" AS ENUM ('MANUAL', 'DSD', 'GSC', 'SYSTEM', 'INFERRED');

-- CreateEnum
CREATE TYPE "EventCategory" AS ENUM ('LIFECYCLE', 'TECHNICAL', 'SEO', 'CONTENT', 'FINANCE', 'INTEGRATION', 'NOTE');

-- CreateEnum
CREATE TYPE "EventSource" AS ENUM ('MANUAL', 'SYSTEM', 'DSD', 'GSC');

-- CreateEnum
CREATE TYPE "IntegrationSystem" AS ENUM ('DSD', 'GSC');

-- CreateEnum
CREATE TYPE "IntegrationStatus" AS ENUM ('PENDING', 'LINKED', 'UNLINKED', 'ERROR');

-- CreateEnum
CREATE TYPE "SyncRunStatus" AS ENUM ('RUNNING', 'SUCCESS', 'FAILED');

-- CreateTable
CREATE TABLE "Website" (
    "id" TEXT NOT NULL,
    "domain" TEXT NOT NULL,
    "normalizedDomain" TEXT NOT NULL,
    "name" TEXT,
    "primaryUrl" TEXT,
    "status" "WebsiteStatus" NOT NULL DEFAULT 'DRAFT',
    "lifecycleStage" "LifecycleStage" NOT NULL DEFAULT 'IDEA',
    "group" TEXT,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "launchedAt" TIMESTAMP(3),
    "launchDateSource" "DateSource",
    "firstHealthyAt" TIMESTAMP(3),
    "gscFirstSeenAt" TIMESTAMP(3),
    "gscAddedAtManual" TIMESTAMP(3),
    "firstImpressionAt" TIMESTAMP(3),
    "firstClickAt" TIMESTAMP(3),
    "lastWorkAt" TIMESTAMP(3),
    "archivedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Website_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WebsiteEvent" (
    "id" TEXT NOT NULL,
    "websiteId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "category" "EventCategory" NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "source" "EventSource" NOT NULL,
    "sourceSystem" TEXT,
    "externalId" TEXT,
    "dedupeKey" TEXT,
    "occurredAt" TIMESTAMP(3) NOT NULL,
    "recordedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "amountMinor" INTEGER,
    "currency" TEXT,
    "quantity" DOUBLE PRECISION,
    "unit" TEXT,
    "metadata" JSONB,
    "createdBy" TEXT,

    CONSTRAINT "WebsiteEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AccountReference" (
    "id" TEXT NOT NULL,
    "system" "IntegrationSystem" NOT NULL,
    "externalAccountId" TEXT NOT NULL,
    "label" TEXT,
    "hasAccess" BOOLEAN NOT NULL DEFAULT false,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AccountReference_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WebsiteIntegration" (
    "id" TEXT NOT NULL,
    "websiteId" TEXT NOT NULL,
    "accountReferenceId" TEXT,
    "system" "IntegrationSystem" NOT NULL,
    "externalEntityId" TEXT,
    "externalKey" TEXT,
    "status" "IntegrationStatus" NOT NULL DEFAULT 'PENDING',
    "lastSyncedAt" TIMESTAMP(3),
    "syncError" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WebsiteIntegration_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SyncRun" (
    "id" TEXT NOT NULL,
    "system" "IntegrationSystem" NOT NULL,
    "status" "SyncRunStatus" NOT NULL DEFAULT 'RUNNING',
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" TIMESTAMP(3),
    "itemsRead" INTEGER NOT NULL DEFAULT 0,
    "itemsWritten" INTEGER NOT NULL DEFAULT 0,
    "error" TEXT,
    "metadata" JSONB,

    CONSTRAINT "SyncRun_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "JobLock" (
    "id" TEXT NOT NULL,
    "lockedAt" TIMESTAMP(3) NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "owner" TEXT,

    CONSTRAINT "JobLock_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Website_normalizedDomain_key" ON "Website"("normalizedDomain");

-- CreateIndex
CREATE INDEX "Website_status_idx" ON "Website"("status");

-- CreateIndex
CREATE INDEX "Website_lifecycleStage_idx" ON "Website"("lifecycleStage");

-- CreateIndex
CREATE INDEX "Website_group_idx" ON "Website"("group");

-- CreateIndex
CREATE INDEX "Website_lastWorkAt_idx" ON "Website"("lastWorkAt");

-- CreateIndex
CREATE UNIQUE INDEX "WebsiteEvent_dedupeKey_key" ON "WebsiteEvent"("dedupeKey");

-- CreateIndex
CREATE INDEX "WebsiteEvent_websiteId_occurredAt_idx" ON "WebsiteEvent"("websiteId", "occurredAt");

-- CreateIndex
CREATE INDEX "WebsiteEvent_eventType_idx" ON "WebsiteEvent"("eventType");

-- CreateIndex
CREATE INDEX "WebsiteEvent_source_idx" ON "WebsiteEvent"("source");

-- CreateIndex
CREATE INDEX "WebsiteEvent_recordedAt_idx" ON "WebsiteEvent"("recordedAt");

-- CreateIndex
CREATE INDEX "AccountReference_system_hasAccess_idx" ON "AccountReference"("system", "hasAccess");

-- CreateIndex
CREATE UNIQUE INDEX "AccountReference_system_externalAccountId_key" ON "AccountReference"("system", "externalAccountId");

-- CreateIndex
CREATE INDEX "WebsiteIntegration_system_externalEntityId_idx" ON "WebsiteIntegration"("system", "externalEntityId");

-- CreateIndex
CREATE INDEX "WebsiteIntegration_system_externalKey_idx" ON "WebsiteIntegration"("system", "externalKey");

-- CreateIndex
CREATE INDEX "WebsiteIntegration_accountReferenceId_idx" ON "WebsiteIntegration"("accountReferenceId");

-- CreateIndex
CREATE UNIQUE INDEX "WebsiteIntegration_websiteId_system_key" ON "WebsiteIntegration"("websiteId", "system");

-- CreateIndex
CREATE INDEX "SyncRun_system_startedAt_idx" ON "SyncRun"("system", "startedAt");

-- CreateIndex
CREATE INDEX "SyncRun_status_idx" ON "SyncRun"("status");

-- CreateIndex
CREATE INDEX "JobLock_expiresAt_idx" ON "JobLock"("expiresAt");

-- AddForeignKey
ALTER TABLE "WebsiteEvent" ADD CONSTRAINT "WebsiteEvent_websiteId_fkey" FOREIGN KEY ("websiteId") REFERENCES "Website"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WebsiteIntegration" ADD CONSTRAINT "WebsiteIntegration_websiteId_fkey" FOREIGN KEY ("websiteId") REFERENCES "Website"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WebsiteIntegration" ADD CONSTRAINT "WebsiteIntegration_accountReferenceId_fkey" FOREIGN KEY ("accountReferenceId") REFERENCES "AccountReference"("id") ON DELETE SET NULL ON UPDATE CASCADE;
