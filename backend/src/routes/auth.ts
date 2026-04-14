import { Router } from "express";
import { randomBytes } from "crypto";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "../utils/prisma";
import { authenticate, getAuthMode } from "../middleware/auth";
import { createSessionToken } from "../middleware/password-auth";
import { audit } from "../services/audit";
import { getOidcDiscovery } from "../services/oidc-discovery";

export const authRouter = Router();

function oidcConfig() {
  const issuer = process.env.OIDC_ISSUER;
  const clientId = process.env.OIDC_CLIENT_ID;
  const clientSecret = process.env.OIDC_CLIENT_SECRET;
  const appUrl = process.env.APP_URL || "http://localhost:3000";
  if (!issuer || !clientId) return null;
  return { clientId, clientSecret, redirectUri: `${appUrl}/auth/callback`, appUrl };
}

// ────────────────────────────────────────────────────────
// Password auth routes
// ────────────────────────────────────────────────────────

const LoginSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
});

const RegisterSchema = z.object({
  username: z.string().min(3).max(64).regex(/^[a-zA-Z0-9_.-]+$/),
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().optional(),
});

authRouter.post("/login", async (req, res) => {
  if (getAuthMode() !== "password") {
    return res.status(400).json({ error: "Password auth is not enabled" });
  }

  const parsed = LoginSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Username and password required" });

  const user = await prisma.localUser.findFirst({
    where: {
      OR: [
        { username: parsed.data.username },
        { email: parsed.data.username },
      ],
    },
  });

  if (!user || !(await bcrypt.compare(parsed.data.password, user.passwordHash))) {
    return res.status(401).json({ error: "Invalid credentials" });
  }

  const token = createSessionToken(user);
  const secure = (process.env.APP_URL || "").startsWith("https");
  res.setHeader(
    "Set-Cookie",
    `ob_session=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=86400${secure ? "; Secure" : ""}`
  );

  audit({ action: "user.login", req, details: { method: "password", username: user.username } });

  res.json({
    success: true,
    user: { sub: user.id, email: user.email, name: user.name || user.username },
  });
});

authRouter.post("/register", async (req, res) => {
  if (getAuthMode() !== "password") {
    return res.status(400).json({ error: "Password auth is not enabled" });
  }

  // Only allow registration if no users exist OR if ALLOW_REGISTRATION=true
  const userCount = await prisma.localUser.count();
  if (userCount > 0 && process.env.ALLOW_REGISTRATION !== "true") {
    return res.status(403).json({ error: "Registration is disabled. Contact an administrator." });
  }

  const parsed = RegisterSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const existing = await prisma.localUser.findFirst({
    where: { OR: [{ username: parsed.data.username }, { email: parsed.data.email }] },
  });
  if (existing) {
    return res.status(409).json({ error: "Username or email already taken" });
  }

  const passwordHash = await bcrypt.hash(parsed.data.password, 12);
  const user = await prisma.localUser.create({
    data: {
      username: parsed.data.username,
      email: parsed.data.email,
      passwordHash,
      name: parsed.data.name,
    },
  });

  const token = createSessionToken(user);
  const secure = (process.env.APP_URL || "").startsWith("https");
  res.setHeader(
    "Set-Cookie",
    `ob_session=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=86400${secure ? "; Secure" : ""}`
  );

  audit({ action: "user.registered", req, details: { username: user.username } });

  res.status(201).json({
    success: true,
    user: { sub: user.id, email: user.email, name: user.name || user.username },
  });
});

// ────────────────────────────────────────────────────────
// OIDC routes
// ────────────────────────────────────────────────────────

// Redirect to OIDC provider (uses discovery for authorization_endpoint)
authRouter.get("/login", async (req, res) => {
  const cfg = oidcConfig();
  if (!cfg) return res.status(501).json({ error: "OIDC not configured" });

  try {
    const discovery = await getOidcDiscovery();
    const state = randomBytes(16).toString("hex");
    res.cookie("ob_oidc_state", state, {
      httpOnly: true,
      sameSite: "lax",
      maxAge: 5 * 60 * 1000,
    });

    const params = new URLSearchParams({
      client_id: cfg.clientId,
      redirect_uri: cfg.redirectUri,
      response_type: "code",
      scope: "openid email profile",
      state,
    });

    res.redirect(`${discovery.authorization_endpoint}?${params.toString()}`);
  } catch (err) {
    console.error("OIDC discovery failed:", err);
    res.status(502).json({ error: "Failed to reach OIDC provider" });
  }
});

// OIDC callback — exchange code for tokens (uses discovery for token_endpoint)
authRouter.get("/callback", async (req, res) => {
  const cfg = oidcConfig();
  if (!cfg) return res.status(501).json({ error: "OIDC not configured" });

  const { code, state } = req.query;
  const savedState = parseCookie(req.headers.cookie, "ob_oidc_state");

  if (!code || !state || state !== savedState) {
    return res.status(400).json({ error: "Invalid OIDC callback" });
  }

  // Clear state cookie
  res.setHeader(
    "Set-Cookie",
    "ob_oidc_state=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0"
  );

  try {
    const discovery = await getOidcDiscovery();
    const body = new URLSearchParams({
      grant_type: "authorization_code",
      client_id: cfg.clientId,
      client_secret: cfg.clientSecret || "",
      redirect_uri: cfg.redirectUri,
      code: code as string,
    });

    const tokenRes = await fetch(discovery.token_endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: body.toString(),
    });

    if (!tokenRes.ok) {
      const err = await tokenRes.text();
      console.error("OIDC token exchange failed:", err);
      return res.status(401).json({ error: "Token exchange failed" });
    }

    const tokens = (await tokenRes.json()) as {
      id_token: string;
      access_token: string;
      expires_in: number;
    };

    // Set the id_token as an HttpOnly session cookie
    const maxAge = (tokens.expires_in || 3600) * 1000;
    const secure = cfg.appUrl.startsWith("https");
    res.setHeader(
      "Set-Cookie",
      `ob_session=${tokens.id_token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${Math.floor(maxAge / 1000)}${secure ? "; Secure" : ""}`
    );

    audit({
      action: "user.login",
      req,
      details: { method: "oidc" },
    });

    // Redirect to frontend dashboard
    const frontendUrl = process.env.FRONTEND_URL || "";
    res.redirect(frontendUrl ? `${frontendUrl}/dashboard` : "/dashboard");
  } catch (err) {
    console.error("OIDC callback error:", err);
    res.status(500).json({ error: "Authentication failed" });
  }
});

// ────────────────────────────────────────────────────────
// Common routes
// ────────────────────────────────────────────────────────

// Get current user info
authRouter.get("/me", authenticate, (req, res) => {
  const user = (req as any).user;
  const apiKey = (req as any).apiKey;
  if (user) {
    return res.json({
      authenticated: true,
      type: getAuthMode() === "password" ? "password" : "oidc",
      user: {
        sub: user.sub,
        email: user.email,
        name: user.name,
        preferred_username: user.preferred_username,
      },
    });
  }
  if (apiKey) {
    return res.json({
      authenticated: true,
      type: "apikey",
      user: { name: apiKey.name, sub: `apikey:${apiKey.name}` },
    });
  }
  res.json({ authenticated: false });
});

// Auth config — tells the frontend what auth mode is active
authRouter.get("/config", async (_req, res) => {
  const mode = getAuthMode();
  const cfg = oidcConfig();

  let registrationOpen = false;
  if (mode === "password") {
    const count = await prisma.localUser.count();
    registrationOpen = count === 0 || process.env.ALLOW_REGISTRATION === "true";
  }

  res.json({
    authDisabled: mode === "disabled",
    oidcEnabled: mode === "oidc" && !!cfg,
    passwordEnabled: mode === "password",
    registrationOpen,
    authMode: mode,
  });
});

// Logout
authRouter.post("/logout", authenticate, (req, res) => {
  audit({ action: "user.logout", req });
  const secure = (process.env.APP_URL || "").startsWith("https");
  res.setHeader(
    "Set-Cookie",
    `ob_session=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${secure ? "; Secure" : ""}`
  );
  res.json({ success: true });
});

function parseCookie(header: string | undefined, name: string): string | null {
  if (!header) return null;
  const match = header.match(new RegExp(`(?:^|;\\s*)${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
}
