import { config } from "dotenv";
config({ override: true });
import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import path from "path";
import { issuerRouter } from "./routes/issuers";
import { badgeClassRouter } from "./routes/badge-classes";
import { assertionRouter } from "./routes/assertions";
import { verifyRouter } from "./routes/verify";
import { uploadRouter } from "./routes/uploads";
import { publicRouter } from "./routes/public";
import { publicOb3Router } from "./routes/public-ob3";
import { apiKeyRouter } from "./routes/api-keys";
import { authRouter } from "./routes/auth";
import { auditEventRouter } from "./routes/audit-events";
import { offlineVerifyRouter } from "./routes/offline-verify";
import { staticExportRouter } from "./routes/static-export";
import { inviteRouter, publicInviteRouter } from "./routes/invites";
import { authenticate, requireAuth } from "./middleware/auth";
import { setupSwagger } from "./swagger";

const app = express();
const PORT = process.env.PORT || 3000;

// Security headers
app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false,
  crossOriginResourcePolicy: false,
  frameguard: false,
}));

app.use(
  cors({
    origin: process.env.FRONTEND_URL || "http://localhost:5173",
    credentials: true,
  })
);
app.use(express.json({ limit: "1mb" }));

// Rate limiting on auth endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // 20 attempts per window
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many requests, please try again later" },
});

// Serve uploaded files from database
app.get("/uploads/:filename", async (req, res) => {
  const { prisma } = await import("./utils/prisma");
  const upload = await prisma.upload.findUnique({ where: { filename: req.params.filename } });
  if (!upload) return res.status(404).send("Not found");
  res.set("Content-Type", upload.mimeType);
  res.set("Cache-Control", "public, max-age=31536000, immutable");
  res.set("Cross-Origin-Resource-Policy", "cross-origin");
  res.set("Access-Control-Allow-Origin", "*");
  res.send(Buffer.from(upload.data));
});

// Swagger API docs (public, no auth)
setupSwagger(app);

// Auth routes (login/callback/logout — must be before requireAuth)
app.use("/auth/login", authLimiter);
app.use("/auth/register", authLimiter);
app.use("/auth", authRouter);

// Authenticate all /api requests (sets req.user or req.apiKey if valid)
app.use("/api", authenticate);

// API key management (requires auth)
app.use("/api/api-keys", requireAuth, apiKeyRouter);

// Protected API routes
app.use("/api/issuers", requireAuth, issuerRouter);
app.use("/api/badge-classes", requireAuth, badgeClassRouter);
app.use("/api/assertions", requireAuth, assertionRouter);
app.use("/api/uploads", requireAuth, uploadRouter);
app.use("/api/audit-events", requireAuth, auditEventRouter);
app.use("/api/static-export", requireAuth, staticExportRouter);
app.use("/api/invites", requireAuth, inviteRouter);

// Public routes (OB 2.0 + OB 3.0 JSON-LD endpoints + verification)
app.use("/ob", publicRouter);
app.use("/ob3", publicOb3Router);
app.use("/verify", verifyRouter);
app.use("/offline-verify", offlineVerifyRouter);
app.use("/invites", publicInviteRouter);

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// Serve frontend — built files in production, proxy to Vite in dev
const frontendDist = process.env.FRONTEND_DIST || path.join(__dirname, "..", "..", "frontend", "dist");
import fs from "fs";
if (fs.existsSync(path.join(frontendDist, "index.html"))) {
  app.use(express.static(frontendDist));
  // SPA fallback — only for navigation requests, not missing assets
  app.get("*", (req, res, next) => {
    // Don't serve index.html for asset requests (js, css, images, etc.)
    if (req.path.startsWith("/assets/") || req.path.match(/\.\w+$/)) {
      return next();
    }
    res.sendFile(path.join(frontendDist, "index.html"));
  });
  console.log("Serving frontend from", frontendDist);
}

app.listen(PORT, () => {
  console.log(`OpenBadge API running on http://localhost:${PORT}`);
  if (process.env.AUTH_DISABLED === "true") {
    console.log("WARNING: Authentication is disabled (AUTH_DISABLED=true)");
  }
});
