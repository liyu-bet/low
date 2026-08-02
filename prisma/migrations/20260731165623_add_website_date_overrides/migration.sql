-- AlterEnum
ALTER TYPE "EventCategory" ADD VALUE 'DATES';

-- AlterTable
ALTER TABLE "Website" ADD COLUMN     "firstClickAtManual" TIMESTAMP(3),
ADD COLUMN     "firstImpressionAtManual" TIMESTAMP(3),
ADD COLUMN     "launchedAtManual" TIMESTAMP(3);
