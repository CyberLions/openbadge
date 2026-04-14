import { prisma } from "../utils/prisma";

/** Delete an Upload row by its imageUrl path (e.g. "/uploads/abc.png"). Silently ignores missing records. */
export async function deleteUploadByUrl(imageUrl: string | null | undefined) {
  if (!imageUrl) return;
  const filename = imageUrl.replace(/^\/uploads\//, "");
  if (!filename || filename === imageUrl) return;
  await prisma.upload.deleteMany({ where: { filename } });
}
