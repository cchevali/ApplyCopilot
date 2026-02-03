import fs from "fs/promises";
import path from "path";
import crypto from "crypto";

export const storageRoot =
  process.env.STORAGE_PATH?.trim() || path.join(process.cwd(), "storage");

export async function ensureStorageDir() {
  await fs.mkdir(storageRoot, { recursive: true });
}

export function safeFileName(originalName: string) {
  const base = originalName.replace(/[^a-zA-Z0-9._-]/g, "_");
  const ext = path.extname(base);
  const name = path.basename(base, ext).slice(0, 60);
  return `${name || "file"}${ext || ""}`;
}

export async function saveUploadedFile(file: File) {
  await ensureStorageDir();
  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  const safeName = safeFileName(file.name || "upload");
  const filename = `${crypto.randomUUID()}-${safeName}`;
  const filePath = path.join(storageRoot, filename);
  await fs.writeFile(filePath, buffer);
  return { filePath, buffer };
}
