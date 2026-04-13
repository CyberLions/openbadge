import express from "express";
import cors from "cors";
import path from "path";
import { issuerRouter } from "./routes/issuers";
import { badgeClassRouter } from "./routes/badge-classes";
import { assertionRouter } from "./routes/assertions";
import { verifyRouter } from "./routes/verify";
import { uploadRouter } from "./routes/uploads";
import { publicRouter } from "./routes/public";

const app = express();
const PORT = process.env.PORT || 3000;

app.use(
  cors({
    origin: process.env.FRONTEND_URL || "http://localhost:5173",
    credentials: true,
  })
);
app.use(express.json());

// Serve uploaded files statically
app.use("/uploads", express.static(path.join(__dirname, "..", "uploads")));

// API routes
app.use("/api/issuers", issuerRouter);
app.use("/api/badge-classes", badgeClassRouter);
app.use("/api/assertions", assertionRouter);
app.use("/api/uploads", uploadRouter);

// Public routes (OB 2.0 JSON-LD endpoints + verification)
app.use("/ob", publicRouter);
app.use("/verify", verifyRouter);

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`OpenBadge API running on http://localhost:${PORT}`);
});
