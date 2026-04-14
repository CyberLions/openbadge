import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { getAuthMode } from "./auth";

describe("getAuthMode", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    delete process.env.AUTH_MODE;
    delete process.env.AUTH_DISABLED;
    delete process.env.OIDC_ISSUER;
    delete process.env.OIDC_CLIENT_ID;
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it("returns 'password' when AUTH_MODE=password", () => {
    process.env.AUTH_MODE = "password";
    expect(getAuthMode()).toBe("password");
  });

  it("returns 'oidc' when AUTH_MODE=oidc", () => {
    process.env.AUTH_MODE = "oidc";
    expect(getAuthMode()).toBe("oidc");
  });

  it("returns 'disabled' when AUTH_MODE=disabled", () => {
    process.env.AUTH_MODE = "disabled";
    expect(getAuthMode()).toBe("disabled");
  });

  it("returns 'disabled' when AUTH_DISABLED=true (legacy)", () => {
    process.env.AUTH_DISABLED = "true";
    expect(getAuthMode()).toBe("disabled");
  });

  it("auto-detects oidc when OIDC_ISSUER and OIDC_CLIENT_ID are set", () => {
    process.env.OIDC_ISSUER = "https://auth.example.com";
    process.env.OIDC_CLIENT_ID = "my-client";
    expect(getAuthMode()).toBe("oidc");
  });

  it("defaults to disabled when nothing is configured", () => {
    expect(getAuthMode()).toBe("disabled");
  });
});
