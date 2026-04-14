import { describe, it, expect, beforeEach } from "vitest";
import { buildIssuerProfile, buildBadgeClassJsonLd, buildAssertionJsonLd } from "./openbadges";

const ISSUER = {
  id: "issuer-1",
  name: "Test University",
  url: "https://test.edu",
  email: "badges@test.edu",
  description: "A test issuer",
  imageUrl: "/uploads/logo.png",
  linkedInOrganizationName: "Test University",
  createdAt: new Date(),
  updatedAt: new Date(),
};

const BADGE_CLASS = {
  id: "bc-1",
  issuerId: "issuer-1",
  name: "Test Badge",
  description: "A badge for testing",
  imageUrl: "/uploads/badge.png",
  criteriaUrl: "https://test.edu/criteria",
  criteriaNarrative: "Complete the test",
  tags: ["testing", "example"],
  createdAt: new Date(),
  updatedAt: new Date(),
  issuer: ISSUER,
};

const ASSERTION = {
  id: "assertion-1",
  badgeClassId: "bc-1",
  recipientEmail: "student@test.edu",
  recipientName: "Jane Student",
  recipientHashed: true,
  salt: "abc123def456",
  issuedOn: new Date("2025-01-15T12:00:00Z"),
  expires: new Date("2026-01-15T12:00:00Z"),
  revoked: false,
  revokedReason: null,
  evidenceUrl: "https://test.edu/evidence",
  evidenceNarrative: "Completed project",
  jws: "header.payload.signature",
  emailSent: true,
  createdAt: new Date(),
  updatedAt: new Date(),
  badgeClass: BADGE_CLASS,
};

beforeEach(() => {
  process.env.APP_URL = "https://badges.test.edu";
});

describe("buildIssuerProfile", () => {
  it("returns valid OB 2.0 Issuer JSON-LD", () => {
    const profile = buildIssuerProfile(ISSUER);
    expect(profile["@context"]).toBe("https://w3id.org/openbadges/v2");
    expect(profile.type).toBe("Issuer");
    expect(profile.name).toBe("Test University");
    expect(profile.url).toBe("https://test.edu");
    expect(profile.email).toBe("badges@test.edu");
  });

  it("includes image URL when imageUrl is set", () => {
    const profile = buildIssuerProfile(ISSUER);
    expect(profile.image).toBe("https://badges.test.edu/uploads/logo.png");
  });

  it("includes public key when keyId is provided", () => {
    const profile = buildIssuerProfile(ISSUER, "key-1");
    expect(profile.publicKey).toBe(
      "https://badges.test.edu/ob/issuers/issuer-1/keys/key-1"
    );
    expect(profile.verification).toEqual({
      type: "signed",
      creator: "https://badges.test.edu/ob/issuers/issuer-1/keys/key-1",
    });
  });

  it("omits description when not set", () => {
    const profile = buildIssuerProfile({ ...ISSUER, description: null });
    expect(profile.description).toBeUndefined();
  });
});

describe("buildBadgeClassJsonLd", () => {
  it("returns valid OB 2.0 BadgeClass JSON-LD", () => {
    const bc = buildBadgeClassJsonLd(BADGE_CLASS);
    expect(bc["@context"]).toBe("https://w3id.org/openbadges/v2");
    expect(bc.type).toBe("BadgeClass");
    expect(bc.name).toBe("Test Badge");
    expect(bc.description).toBe("A badge for testing");
  });

  it("includes criteria URL and narrative", () => {
    const bc = buildBadgeClassJsonLd(BADGE_CLASS);
    expect((bc.criteria as any).id).toBe("https://test.edu/criteria");
    expect((bc.criteria as any).narrative).toBe("Complete the test");
  });

  it("includes tags", () => {
    const bc = buildBadgeClassJsonLd(BADGE_CLASS);
    expect(bc.tags).toEqual(["testing", "example"]);
  });

  it("omits tags when empty", () => {
    const bc = buildBadgeClassJsonLd({ ...BADGE_CLASS, tags: [] });
    expect(bc.tags).toBeUndefined();
  });
});

describe("buildAssertionJsonLd", () => {
  it("returns valid OB 2.0 Assertion JSON-LD", () => {
    const a = buildAssertionJsonLd(ASSERTION);
    expect(a["@context"]).toBe("https://w3id.org/openbadges/v2");
    expect(a.type).toBe("Assertion");
    expect(a.issuedOn).toBe("2025-01-15T12:00:00.000Z");
  });

  it("hashes recipient email when recipientHashed is true", () => {
    const a = buildAssertionJsonLd(ASSERTION);
    const recipient = a.recipient as any;
    expect(recipient.hashed).toBe(true);
    expect(recipient.identity).toMatch(/^sha256\$/);
    expect(recipient.salt).toBe("abc123def456");
  });

  it("uses signed verification when JWS is present", () => {
    const a = buildAssertionJsonLd(ASSERTION);
    expect((a.verification as any).type).toBe("signed");
  });

  it("uses hosted verification when no JWS", () => {
    const a = buildAssertionJsonLd({ ...ASSERTION, jws: null });
    expect((a.verification as any).type).toBe("hosted");
  });

  it("includes evidence when present", () => {
    const a = buildAssertionJsonLd(ASSERTION);
    expect((a.evidence as any).id).toBe("https://test.edu/evidence");
    expect((a.evidence as any).narrative).toBe("Completed project");
  });

  it("includes recipient profile extension", () => {
    const a = buildAssertionJsonLd(ASSERTION);
    expect(a["extensions:recipientProfile"]).toBeDefined();
    expect((a["extensions:recipientProfile"] as any).name).toBe("Jane Student");
  });

  it("includes revocation info when revoked", () => {
    const a = buildAssertionJsonLd({
      ...ASSERTION,
      revoked: true,
      revokedReason: "Cheating",
    });
    expect(a.revoked).toBe(true);
    expect(a.revocationReason).toBe("Cheating");
  });

  it("includes expiration when set", () => {
    const a = buildAssertionJsonLd(ASSERTION);
    expect(a.expires).toBe("2026-01-15T12:00:00.000Z");
  });
});
