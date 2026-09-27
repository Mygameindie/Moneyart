import { mkdir, writeFile } from "fs/promises";
import path from "path";
import crypto from "crypto";

export const UPLOAD_DIR = path.join(process.cwd(), "public", "uploads");
export const MAX_UPLOAD_BYTES = 25 * 1024 * 1024; // 25MB

const IMAGE_MIME_PREFIXES = ["image/"];

export function isImageMime(mime: string) {
  return IMAGE_MIME_PREFIXES.some((p) => mime.startsWith(p));
}

function sanitizeFilename(name: string) {
  const base = name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(-80);
  return base || "file";
}

/**
 * Saves an uploaded File (from a multipart FormData) to public/uploads and
 * returns its public URL + detected type. Any file type is accepted; images
 * get a dedicated "image" fileType so the UI can render a preview instead of
 * a generic file icon.
 */
export async function saveUploadedFile(file: File) {
  if (file.size > MAX_UPLOAD_BYTES) {
    throw new Error("File is too large (max 25MB)");
  }

  await mkdir(UPLOAD_DIR, { recursive: true });

  const ext = path.extname(file.name) || "";
  const unique = crypto.randomBytes(8).toString("hex");
  const safeName = `${Date.now()}-${unique}-${sanitizeFilename(path.basename(file.name, ext))}${ext}`;

  const buffer = Buffer.from(await file.arrayBuffer());
  await writeFile(path.join(UPLOAD_DIR, safeName), buffer);

  const mimeType = file.type || "application/octet-stream";
  return {
    url: `/uploads/${safeName}`,
    mimeType,
    fileType: isImageMime(mimeType) ? "image" : "file",
    size: file.size,
    originalName: file.name,
  };
}
