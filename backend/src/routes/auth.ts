import { Router } from "express";
import { randomBytes } from "crypto";
import { authenticate } from "../middleware/auth";
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

    // Redirect to frontend
    res.redirect(process.env.FRONTEND_URL || "/");
  } catch (err) {
    console.error("OIDC callback error:", err);
    res.status(500).json({ error: "Authentication failed" });
  }
});

// Get current user info
authRouter.get("/me", authenticate, (req, res) => {
  const user = (req as any).user;
  const apiKey = (req as any).apiKey;
  if (user) {
    return res.json({
      authenticated: true,
      type: "oidc",
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

// Auth config — tells the frontend whether OIDC is available and auth is required
authRouter.get("/config", (_req, res) => {
  const cfg = oidcConfig();
  res.json({
    authDisabled: process.env.AUTH_DISABLED === "true",
    oidcEnabled: !!cfg,
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
