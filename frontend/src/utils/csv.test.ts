import { describe, it, expect } from "vitest";
import { parseCsvLine, parseCsvRecipients } from "./csv";

describe("parseCsvLine", () => {
  it("splits simple comma-separated values", () => {
    expect(parseCsvLine("a,b,c")).toEqual(["a", "b", "c"]);
  });

  it("handles quoted fields", () => {
    expect(parseCsvLine('"hello, world",b,c')).toEqual([
      "hello, world",
      "b",
      "c",
    ]);
  });

  it("handles escaped quotes", () => {
    expect(parseCsvLine('"say ""hi""",b')).toEqual(['say "hi"', "b"]);
  });

  it("handles empty fields", () => {
    expect(parseCsvLine(",b,")).toEqual(["", "b", ""]);
  });

  it("handles single field", () => {
    expect(parseCsvLine("only")).toEqual(["only"]);
  });
});

describe("parseCsvRecipients", () => {
  it("parses basic CSV with email and name columns", () => {
    const csv = "email,name\njohn@example.com,John Doe\njane@example.com,Jane Doe";
    const result = parseCsvRecipients(csv);
    expect(result.error).toBeUndefined();
    expect(result.recipients).toEqual([
      { email: "john@example.com", name: "John Doe" },
      { email: "jane@example.com", name: "Jane Doe" },
    ]);
  });

  it("handles 'Email Address' header variant", () => {
    const csv = "Email Address,Full Name\nalice@test.com,Alice";
    const result = parseCsvRecipients(csv);
    expect(result.recipients).toHaveLength(1);
    expect(result.recipients[0].email).toBe("alice@test.com");
  });

  it("handles email-only CSV (no name column)", () => {
    const csv = "email\nuser@test.com";
    const result = parseCsvRecipients(csv);
    expect(result.recipients).toEqual([{ email: "user@test.com" }]);
  });

  it("skips invalid email rows", () => {
    const csv = "email,name\nbad-email,Bob\nvalid@test.com,Valid";
    const result = parseCsvRecipients(csv);
    expect(result.recipients).toHaveLength(1);
    expect(result.recipients[0].email).toBe("valid@test.com");
  });

  it("returns error when no email column found", () => {
    const csv = "name,phone\nJohn,555-1234";
    const result = parseCsvRecipients(csv);
    expect(result.error).toContain("email");
    expect(result.recipients).toHaveLength(0);
  });

  it("returns error for empty CSV", () => {
    const result = parseCsvRecipients("");
    expect(result.error).toBeDefined();
  });

  it("handles Windows-style line endings", () => {
    const csv = "email,name\r\njohn@test.com,John\r\njane@test.com,Jane";
    const result = parseCsvRecipients(csv);
    expect(result.recipients).toHaveLength(2);
  });

  it("treats empty name as undefined", () => {
    const csv = "email,name\nuser@test.com,";
    const result = parseCsvRecipients(csv);
    expect(result.recipients[0].name).toBeUndefined();
  });
});
