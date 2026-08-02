-- Allow multiple GSC property integrations per website (unique by system + external entity).
DROP INDEX IF EXISTS "WebsiteIntegration_websiteId_system_key";

CREATE UNIQUE INDEX "WebsiteIntegration_system_externalEntityId_key" ON "WebsiteIntegration"("system", "externalEntityId");

CREATE INDEX "WebsiteIntegration_websiteId_system_idx" ON "WebsiteIntegration"("websiteId", "system");
