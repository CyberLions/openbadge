import { Router } from "express";
import multer from "multer";
import path from "path";
import { v4 as uuid } from "uuid";

export const uploadRouter = Router();

const storage = multer.diskStorage({
  destination: path.join(__dirname, "..", "..", "uploads"),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${uuid()}${ext}`);
  },
});

const upload = multer({
  storage,
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
uploadRouter.post("/", upload.single("image"), (req, res) => {
  if (!req.file) return res.status(400).json({ error: "No file uploaded" });

  const imageUrl = `/uploads/${req.file.filename}`;
  res.status(201).json({
    imageUrl,
    filename: req.file.filename,
    originalName: req.file.originalname,
    size: req.file.size,
  });
});
