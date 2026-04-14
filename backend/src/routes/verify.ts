import { Router } from "express";
import path from "path";
import fs from "fs";
import { prisma } from "../utils/prisma";
import { verifyJws } from "../utils/signing";
import { buildAssertionJsonLd } from "../services/openbadges";
import { hashIdentity } from "../utils/hashing";
import { bakePng } from "../utils/badge-baking";

export const verifyRouter = Router();

// Verify an assertion by ID
verifyRouter.get("/:id", async (req, res) => {
  const assertion = await prisma.assertion.findUnique({
    where: { id: req.params.id },
    include: { badgeClass: { include: { issuer: true } } },
  });

  if (!assertion) {
    return res.json({ valid: false, reason: "Assertion not found" });
  }

  if (assertion.revoked) {
    return res.json({
      valid: false,
      reason: `Badge has been revoked${assertion.revokedReason ? `: ${assertion.revokedReason}` : ""}`,
      assertion: buildAssertionJsonLd(assertion),
    });
  }

  if (assertion.expires && new Date(assertion.expires) < new Date()) {
    return res.json({
      valid: false,
      reason: "Badge has expired",
      assertion: buildAssertionJsonLd(assertion),
    });
  }

  // If signed, verify the JWS
  if (assertion.jws) {
    const key = await prisma.signingKey.findFirst({
      where: { issuerId: assertion.badgeClass.issuerId, active: true },
    });

    if (!key) {
      return res.json({
        valid: false,
        reason: "No signing key found for verification",
      });
    }

    try {
      await verifyJws(assertion.jws, key.publicKeyPem);
    } catch {
      return res.json({
        valid: false,
        reason: "Signature verification failed",
      });
    }
  }

  res.json({
    valid: true,
    assertion: buildAssertionJsonLd(assertion),
    badgeClass: {
      name: assertion.badgeClass.name,
      description: assertion.badgeClass.description,
      image: `${process.env.APP_URL}${assertion.badgeClass.imageUrl}`,
      criteriaUrl: assertion.badgeClass.criteriaUrl,
      criteriaNarrative: assertion.badgeClass.criteriaNarrative,
      tags: assertion.badgeClass.tags,
    },
    issuer: {
      name: assertion.badgeClass.issuer.name,
      url: assertion.badgeClass.issuer.url,
      linkedInOrganizationName: assertion.badgeClass.issuer.linkedInOrganizationName,
    },
  });
});

// Verify by email: check if an email matches a specific assertion
verifyRouter.post("/:id/check-recipient", async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: "Email required" });

  const assertion = await prisma.assertion.findUnique({
    where: { id: req.params.id },
  });
  if (!assertion) return res.json({ match: false });

  const hashed = hashIdentity(email, assertion.salt);
  const expected = hashIdentity(assertion.recipientEmail, assertion.salt);
  res.json({ match: hashed === expected });
});

// Download baked badge image
verifyRouter.get("/:id/baked-image", async (req, res) => {
  const assertion = await prisma.assertion.findUnique({
    where: { id: req.params.id },
    include: { badgeClass: true },
  });
  if (!assertion) return res.status(404).json({ error: "Assertion not found" });

  // imageUrl is like "/uploads/abc.png" — resolve relative to the backend root
  const imagePath = path.join(__dirname, "..", "..", assertion.badgeClass.imageUrl);

  if (!fs.existsSync(imagePath)) {
    return res.status(400).json({ error: "Badge image not found" });
  }

  if (!imagePath.toLowerCase().endsWith(".png")) {
    // For non-PNG images, just serve the original
    return res.sendFile(path.resolve(imagePath));
  }

  const assertionData = assertion.jws || `${process.env.APP_URL}/ob/assertions/${assertion.id}`;

  try {
    const bakedBuffer = await bakePng(imagePath, assertionData);
    res.set({
      "Content-Type": "image/png",
      "Content-Disposition": `attachment; filename="badge-${assertion.id}.png"`,
    });
    res.send(bakedBuffer);
  } catch (err) {
    console.error("Baking failed:", err);
    res.status(500).json({ error: "Failed to bake badge image" });
  }
});
