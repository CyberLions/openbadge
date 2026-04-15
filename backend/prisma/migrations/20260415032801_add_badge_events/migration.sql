-- CreateTable
CREATE TABLE "BadgeEvent" (
    "id" TEXT NOT NULL,
    "assertionId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BadgeEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "BadgeEvent_assertionId_idx" ON "BadgeEvent"("assertionId");

-- CreateIndex
CREATE INDEX "BadgeEvent_type_idx" ON "BadgeEvent"("type");

-- CreateIndex
CREATE INDEX "BadgeEvent_createdAt_idx" ON "BadgeEvent"("createdAt");
