import { describe, it, expect, beforeEach } from "vitest";
import { createSessionToken } from "./password-auth";
import { createHmac } from "crypto";

const TEST_USER = {
  id: "user-123",
  username: "admin",
  email: "admin@example.com",
  name: "Admin User",
};

describe("createSessionToken", () => {
  beforeEach(() => {
    process.env.SESSION_SECRET = "test-secret-key";
  });

  it("returns a dot-separated token", () => {
    const token = createSessionToken(TEST_USER);
    const parts = token.split(".");
    expect(parts).toHaveLength(2);
  });

  it("payload contains user info", () => {
    const token = createSessionToken(TEST_USER);
    const payloadB64 = token.split(".")[0];
    const payload = JSON.parse(Buffer.from(payloadB64, "base64url").toString());
    expect(payload.sub).toBe("user-123");
    expect(payload.email).toBe("admin@example.com");
    expect(payload.name).toBe("Admin User");
  });

  it("payload has an expiry in the future", () => {
    const token = createSessionToken(TEST_USER);
    const payloadB64 = token.split(".")[0];
    const payload = JSON.parse(Buffer.from(payloadB64, "base64url").toString());
    expect(payload.exp).toBeGreaterThan(Date.now());
  });

  it("signature is valid HMAC-SHA256", () => {
    const token = createSessionToken(TEST_USER);
    const [payloadB64, sig] = token.split(".");
    const expected = createHmac("sha256", "test-secret-key")
      .update(payloadB64)
      .digest("base64url");
    expect(sig).toBe(expected);
  });

  it("uses username as name fallback when name is null", () => {
    const token = createSessionToken({ ...TEST_USER, name: null });
    const payloadB64 = token.split(".")[0];
    const payload = JSON.parse(Buffer.from(payloadB64, "base64url").toString());
    expect(payload.name).toBe("admin");
  });
});
