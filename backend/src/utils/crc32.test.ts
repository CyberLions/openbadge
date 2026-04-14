import { describe, it, expect } from "vitest";
import { crc32 } from "./crc32";

describe("crc32", () => {
  it("computes correct CRC32 for known input", () => {
    // CRC32 of "123456789" should be 0xCBF43926
    const buf = Buffer.from("123456789", "ascii");
    expect(crc32(buf)).toBe(0xcbf43926);
  });

  it("returns 0 for empty buffer", () => {
    expect(crc32(Buffer.alloc(0))).toBe(0);
  });

  it("is deterministic", () => {
    const buf = Buffer.from("openbadges", "utf-8");
    expect(crc32(buf)).toBe(crc32(buf));
  });

  it("different inputs produce different checksums", () => {
    const a = crc32(Buffer.from("hello"));
    const b = crc32(Buffer.from("world"));
    expect(a).not.toBe(b);
  });
});
