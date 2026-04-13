import { Router } from "express";
import { prisma } from "../utils/prisma";
import {
  buildIssuerProfile,
  buildBadgeClassJsonLd,
  buildAssertionJsonLd,
} from "../services/openbadges";

export const publicRouter = Router();

// OB 2.0 Issuer Profile endpoint
publicRouter.get("/issuers/:id", async (req, res) => {
  const issuer = await prisma.issuer.findUnique({
    where: { id: req.params.id },
    include: { signingKeys: { where: { active: true }, take: 1 } },
  });
  if (!issuer) return res.status(404).json({ error: "Issuer not found" });

  const keyId = issuer.signingKeys[0]?.id;
  res.type("application/ld+json").json(buildIssuerProfile(issuer, keyId));
});

// OB 2.0 Public Key endpoint
publicRouter.get("/issuers/:issuerId/keys/:keyId", async (req, res) => {
  const key = await prisma.signingKey.findFirst({
    where: { id: req.params.keyId, issuerId: req.params.issuerId },
    include: { issuer: true },
  });
  if (!key) return res.status(404).json({ error: "Key not found" });

  res.type("application/ld+json").json({
    "@context": "https://w3id.org/openbadges/v2",
    type: "CryptographicKey",
    id: `${process.env.APP_URL}/ob/issuers/${req.params.issuerId}/keys/${req.params.keyId}`,
    owner: `${process.env.APP_URL}/ob/issuers/${req.params.issuerId}`,
    publicKeyPem: key.publicKeyPem,
  });
});

// OB 2.0 BadgeClass endpoint
publicRouter.get("/badge-classes/:id", async (req, res) => {
  const badge = await prisma.badgeClass.findUnique({
    where: { id: req.params.id },
    include: { issuer: true },
  });
  if (!badge) return res.status(404).json({ error: "BadgeClass not found" });

  res.type("application/ld+json").json(buildBadgeClassJsonLd(badge));
});

// OB 2.0 Assertion endpoint (for hosted verification)
publicRouter.get("/assertions/:id", async (req, res) => {
  const assertion = await prisma.assertion.findUnique({
    where: { id: req.params.id },
    include: { badgeClass: { include: { issuer: true } } },
  });
  if (!assertion) return res.status(404).json({ error: "Assertion not found" });

  res.type("application/ld+json").json(buildAssertionJsonLd(assertion));
});

// Revocation list for an issuer
publicRouter.get("/issuers/:id/revocations", async (req, res) => {
  const revoked = await prisma.assertion.findMany({
    where: {
      badgeClass: { issuerId: req.params.id },
      revoked: true,
    },
    select: { id: true, revokedReason: true },
  });

  res.type("application/ld+json").json({
    "@context": "https://w3id.org/openbadges/v2",
    type: "RevocationList",
    id: `${process.env.APP_URL}/ob/issuers/${req.params.id}/revocations`,
    revokedAssertions: revoked.map((a) => ({
      id: `${process.env.APP_URL}/ob/assertions/${a.id}`,
      revocationReason: a.revokedReason || "Revoked by issuer",
    })),
  });
});
