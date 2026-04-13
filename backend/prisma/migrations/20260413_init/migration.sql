-- CreateTable
CREATE TABLE "Issuer" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "description" TEXT,
    "imageUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Issuer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SigningKey" (
    "id" TEXT NOT NULL,
    "issuerId" TEXT NOT NULL,
    "publicKeyPem" TEXT NOT NULL,
    "privateKeyPem" TEXT NOT NULL,
    "algorithm" TEXT NOT NULL DEFAULT 'EdDSA',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SigningKey_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BadgeClass" (
    "id" TEXT NOT NULL,
    "issuerId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "imageUrl" TEXT NOT NULL,
    "criteriaUrl" TEXT,
    "criteriaNarrative" TEXT,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BadgeClass_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Assertion" (
    "id" TEXT NOT NULL,
    "badgeClassId" TEXT NOT NULL,
    "recipientEmail" TEXT NOT NULL,
    "recipientName" TEXT,
    "recipientHashed" BOOLEAN NOT NULL DEFAULT true,
    "salt" TEXT NOT NULL,
    "issuedOn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires" TIMESTAMP(3),
    "revoked" BOOLEAN NOT NULL DEFAULT false,
    "revokedReason" TEXT,
    "evidenceUrl" TEXT,
    "evidenceNarrative" TEXT,
    "jws" TEXT,
    "emailSent" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Assertion_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SigningKey_issuerId_idx" ON "SigningKey"("issuerId");

-- CreateIndex
CREATE INDEX "BadgeClass_issuerId_idx" ON "BadgeClass"("issuerId");

-- CreateIndex
CREATE INDEX "Assertion_badgeClassId_idx" ON "Assertion"("badgeClassId");

-- CreateIndex
CREATE INDEX "Assertion_recipientEmail_idx" ON "Assertion"("recipientEmail");

-- AddForeignKey
ALTER TABLE "SigningKey" ADD CONSTRAINT "SigningKey_issuerId_fkey" FOREIGN KEY ("issuerId") REFERENCES "Issuer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BadgeClass" ADD CONSTRAINT "BadgeClass_issuerId_fkey" FOREIGN KEY ("issuerId") REFERENCES "Issuer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Assertion" ADD CONSTRAINT "Assertion_badgeClassId_fkey" FOREIGN KEY ("badgeClassId") REFERENCES "BadgeClass"("id") ON DELETE CASCADE ON UPDATE CASCADE;
