import { Router } from "express";
import { prisma } from "../utils/prisma";
import {
  buildOb3Profile,
  buildOb3Achievement,
  buildOb3Credential,
  signOb3Credential,
} from "../services/openbadges3";

export const publicOb3Router = Router();

// OBv3 Issuer Profile
publicOb3Router.get("/issuers/:id", async (req, res) => {
  const issuer = await prisma.issuer.findUnique({
    where: { id: req.params.id },
    include: { signingKeys: { where: { active: true }, take: 1 } },
  });
  if (!issuer) return res.status(404).json({ error: "Issuer not found" });

  res
    .type("application/ld+json")
    .json(buildOb3Profile(issuer, issuer.signingKeys[0]));
});

// OBv3 Achievement (replaces BadgeClass)
publicOb3Router.get("/achievements/:id", async (req, res) => {
  const badge = await prisma.badgeClass.findUnique({
    where: { id: req.params.id },
    include: { issuer: true },
  });
  if (!badge) return res.status(404).json({ error: "Achievement not found" });

  res.type("application/ld+json").json({
    "@context": [
      "https://www.w3.org/ns/credentials/v2",
      "https://purl.imsglobal.org/spec/ob/v3p0/context-3.0.3.json",
    ],
    ...buildOb3Achievement(badge),
  });
});

// OBv3 AchievementCredential (signed)
publicOb3Router.get("/credentials/:id", async (req, res) => {
  const assertion = await prisma.assertion.findUnique({
    where: { id: req.params.id },
    include: { badgeClass: { include: { issuer: true } } },
  });
  if (!assertion)
    return res.status(404).json({ error: "Credential not found" });

  const signingKey = await prisma.signingKey.findFirst({
    where: { issuerId: assertion.badgeClass.issuerId, active: true },
  });

  let credential = buildOb3Credential(assertion);

  // Sign if we have a key
  if (signingKey) {
    credential = await signOb3Credential(
      credential,
      signingKey,
      assertion.badgeClass.issuerId
    );
  }

  res.type("application/ld+json").json(credential);
});

// OBv3 Revocation list for an issuer
publicOb3Router.get("/issuers/:id/revocations", async (req, res) => {
  const revoked = await prisma.assertion.findMany({
    where: {
      badgeClass: { issuerId: req.params.id },
      revoked: true,
    },
    select: { id: true, revokedReason: true },
  });

  res.type("application/ld+json").json({
    "@context": [
      "https://www.w3.org/ns/credentials/v2",
      "https://purl.imsglobal.org/spec/ob/v3p0/context-3.0.3.json",
    ],
    type: "1EdTechRevocationList",
    id: `${process.env.APP_URL}/ob3/issuers/${req.params.id}/revocations`,
    revokedCredentials: revoked.map((a) => ({
      id: `${process.env.APP_URL}/ob3/credentials/${a.id}`,
      type: "RevokedCredential",
      revocationReason: a.revokedReason || "Revoked by issuer",
    })),
  });
});
