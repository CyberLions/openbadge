import { Router } from "express";
import multer from "multer";
import path from "path";
import { v4 as uuid } from "uuid";
import { prisma } from "../utils/prisma";

export const uploadRouter = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (_req, file, cb) => {
    const allowed = [".png", ".jpg", ".jpeg", ".svg", ".webp"];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowed.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error(`File type ${ext} not allowed. Allowed: ${allowed.join(", ")}`));
    }
  },
});

// Upload a badge image
uploadRouter.post("/", upload.single("image"), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: "No file uploaded" });

  const ext = path.extname(req.file.originalname).toLowerCase();
  const filename = `${uuid()}${ext}`;

  await prisma.upload.create({
    data: {
      filename,
      mimeType: req.file.mimetype,
      size: req.file.size,
      data: req.file.buffer,
    },
  });

  const imageUrl = `/uploads/${filename}`;
  res.status(201).json({
    imageUrl,
    filename,
    originalName: req.file.originalname,
    size: req.file.size,
  });
});
