-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('ADMIN', 'MEMBER');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" "UserRole" NOT NULL DEFAULT 'MEMBER',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "mustChangePassword" BOOLEAN NOT NULL DEFAULT true,
    "sessionVersion" INTEGER NOT NULL DEFAULT 1,
    "lastLoginAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_isActive_idx" ON "User"("isActive");

-- CreateIndex
CREATE INDEX "User_role_idx" ON "User"("role");

-- AlterTable WebsiteTask
ALTER TABLE "WebsiteTask" ADD COLUMN "createdByUserId" TEXT;
ALTER TABLE "WebsiteTask" ADD COLUMN "assignedToUserId" TEXT;
ALTER TABLE "WebsiteTask" ADD COLUMN "completedByUserId" TEXT;

-- CreateIndex
CREATE INDEX "WebsiteTask_createdByUserId_idx" ON "WebsiteTask"("createdByUserId");

-- CreateIndex
CREATE INDEX "WebsiteTask_assignedToUserId_status_idx" ON "WebsiteTask"("assignedToUserId", "status");

-- CreateIndex
CREATE INDEX "WebsiteTask_completedByUserId_idx" ON "WebsiteTask"("completedByUserId");

-- AddForeignKey
ALTER TABLE "WebsiteTask" ADD CONSTRAINT "WebsiteTask_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WebsiteTask" ADD CONSTRAINT "WebsiteTask_assignedToUserId_fkey" FOREIGN KEY ("assignedToUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WebsiteTask" ADD CONSTRAINT "WebsiteTask_completedByUserId_fkey" FOREIGN KEY ("completedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AlterTable WebsiteEvent
ALTER TABLE "WebsiteEvent" ADD COLUMN "createdByUserId" TEXT;

-- CreateIndex
CREATE INDEX "WebsiteEvent_createdByUserId_idx" ON "WebsiteEvent"("createdByUserId");

-- AddForeignKey
ALTER TABLE "WebsiteEvent" ADD CONSTRAINT "WebsiteEvent_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
