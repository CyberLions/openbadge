import { describe, it, expect } from "vitest";
import { generateSalt, hashIdentity } from "./hashing";

describe("generateSalt", () => {
  it("returns a 32-char hex string", () => {
    const salt = generateSalt();
    expect(salt).toMatch(/^[0-9a-f]{32}$/);
  });

  it("returns unique values", () => {
    const salts = new Set(Array.from({ length: 20 }, () => generateSalt()));
    expect(salts.size).toBe(20);
  });
});

describe("hashIdentity", () => {
  it("produces a sha256$ prefixed hash", () => {
    const hash = hashIdentity("user@example.com", "abc123");
    expect(hash).toMatch(/^sha256\$[0-9a-f]{64}$/);
  });

  it("is case-insensitive for email", () => {
    const salt = "test-salt";
    expect(hashIdentity("User@Example.COM", salt)).toBe(
      hashIdentity("user@example.com", salt)
    );
  });

  it("produces different hashes for different salts", () => {
    const email = "user@example.com";
    expect(hashIdentity(email, "salt1")).not.toBe(
      hashIdentity(email, "salt2")
    );
  });

  it("produces different hashes for different emails", () => {
    const salt = "same-salt";
    expect(hashIdentity("a@b.com", salt)).not.toBe(
      hashIdentity("c@d.com", salt)
    );
  });
});
