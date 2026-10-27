import "server-only";
import { randomUUID } from "node:crypto";
import { db } from "@/lib/supabase/admin";

export const MEDIA_BUCKET = "media";
export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;

const EXTENSIONS: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/avif": "avif",
};

/** Stores an image in the public Supabase bucket and returns its public URL. */
export async function uploadImage(file: File, folder: "products" | "site"): Promise<string> {
  const extension = EXTENSIONS[file.type];
  if (!extension) throw new Error("Please use a JPG, PNG, WebP or AVIF image.");
  if (file.size > MAX_UPLOAD_BYTES) throw new Error("Images must be 10 MB or smaller.");

  const now = new Date();
  const month = String(now.getUTCMonth() + 1).padStart(2, "0");
  const path = `${folder}/${now.getUTCFullYear()}/${month}/${randomUUID()}.${extension}`;

  const bucket = db().storage.from(MEDIA_BUCKET);
  const { error } = await bucket.upload(path, await file.arrayBuffer(), {
    contentType: file.type,
    cacheControl: "31536000",
    upsert: false,
  });
  if (error) throw new Error(error.message);
  return bucket.getPublicUrl(path).data.publicUrl;
}
