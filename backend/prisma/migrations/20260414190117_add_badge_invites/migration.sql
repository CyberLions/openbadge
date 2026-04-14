-- CreateTable
CREATE TABLE "BadgeInvite" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "badgeClassId" TEXT NOT NULL,
    "recipientEmail" TEXT,
    "recipientName" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "assertionId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BadgeInvite_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "BadgeInvite_token_key" ON "BadgeInvite"("token");

-- CreateIndex
CREATE INDEX "BadgeInvite_token_idx" ON "BadgeInvite"("token");

-- CreateIndex
CREATE INDEX "BadgeInvite_badgeClassId_idx" ON "BadgeInvite"("badgeClassId");

-- AddForeignKey
ALTER TABLE "BadgeInvite" ADD CONSTRAINT "BadgeInvite_badgeClassId_fkey" FOREIGN KEY ("badgeClassId") REFERENCES "BadgeClass"("id") ON DELETE CASCADE ON UPDATE CASCADE;
