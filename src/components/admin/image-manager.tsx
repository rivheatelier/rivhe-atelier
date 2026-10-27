"use client";

import Image from "next/image";
import { useRef, useState } from "react";
import { IconChevronLeft, IconChevronRight, IconPlus, IconTrash } from "@/components/icons";

const MAX_EDGE = 2400;

/** Downscale and re-encode in the browser so phone photos upload quickly and stay under size limits. */
async function prepareImage(file: File): Promise<Blob> {
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    throw new Error(`${file.name}: this format can’t be opened here. Please use JPG or PNG.`);
  }
  const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height));
  if (scale === 1 && file.type === "image/jpeg" && file.size <= 3.5 * 1024 * 1024) {
    bitmap.close();
    return file;
  }
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Your browser couldn’t process this image.");
  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  return new Promise((resolve, reject) =>
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error("Couldn’t process image."))), "image/jpeg", 0.88),
  );
}

/**
 * Upload, reorder and remove photos. The ordered list of URLs is submitted with
 * the surrounding form as JSON in a hidden input.
 */
export function ImageManager({
  name,
  initial,
  folder = "products",
  max = 10,
  aspect = "aspect-[4/5]",
}: {
  name: string;
  initial: string[];
  folder?: "products" | "site";
  max?: number;
  aspect?: string;
}) {
  const [images, setImages] = useState(initial);
  const [uploading, setUploading] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const input = useRef<HTMLInputElement>(null);

  const upload = async (files: FileList | null) => {
    if (!files?.length) return;
    setError(null);
    const batch = Array.from(files).slice(0, Math.max(0, max - images.length));
    setUploading((n) => n + batch.length);
    for (const file of batch) {
      try {
        const blob = await prepareImage(file);
        const body = new FormData();
        body.append("file", blob, `${file.name.replace(/\.[^.]+$/, "") || "photo"}.jpg`);
        body.append("folder", folder);
        const res = await fetch("/api/admin/upload", { method: "POST", body });
        const json = (await res.json().catch(() => ({}))) as { url?: string; error?: string };
        if (!res.ok || !json.url) throw new Error(json.error ?? `Upload failed (${res.status})`);
        setImages((list) => [...list, json.url as string]);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Upload failed.");
      } finally {
        setUploading((n) => n - 1);
      }
    }
    if (input.current) input.current.value = "";
  };

  const move = (from: number, to: number) =>
    setImages((list) => {
      if (to < 0 || to >= list.length) return list;
      const next = [...list];
      [next[from], next[to]] = [next[to], next[from]];
      return next;
    });

  return (
    <div>
      <input type="hidden" name={name} value={JSON.stringify(images)} />
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
        {images.map((src, i) => (
          <div key={src} className={`relative ${aspect} overflow-hidden rounded-[3px] bg-cream`}>
            <Image src={src} alt="" fill sizes="(min-width: 640px) 180px, 33vw" className="object-cover" />
            {i === 0 && (
              <span className="absolute top-1.5 left-1.5 rounded-[2px] bg-ink px-1.5 py-0.5 text-[9px] tracking-[0.14em] text-paper uppercase">
                Cover
              </span>
            )}
            <div className="absolute inset-x-0 bottom-0 flex items-center justify-between bg-gradient-to-t from-black/55 to-transparent px-0.5 pt-4">
              <button
                type="button"
                onClick={() => move(i, i - 1)}
                disabled={i === 0}
                aria-label="Move earlier"
                className="grid h-9 w-9 place-items-center text-white disabled:opacity-30"
              >
                <IconChevronLeft className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => setImages((list) => list.filter((_, k) => k !== i))}
                aria-label="Remove photo"
                className="grid h-9 w-9 place-items-center text-white"
              >
                <IconTrash className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => move(i, i + 1)}
                disabled={i === images.length - 1}
                aria-label="Move later"
                className="grid h-9 w-9 place-items-center text-white disabled:opacity-30"
              >
                <IconChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        ))}
        {Array.from({ length: uploading }, (_, i) => (
          <div key={`uploading-${i}`} className={`${aspect} animate-pulse rounded-[3px] bg-sand`} />
        ))}
        {images.length + uploading < max && (
          <button
            type="button"
            onClick={() => input.current?.click()}
            className={`grid ${aspect} place-items-center rounded-[3px] border border-dashed border-ink/25 bg-paper text-ink-2 transition-colors hover:border-ink/50`}
          >
            <span className="flex flex-col items-center gap-1.5 text-[12px]">
              <IconPlus className="h-5 w-5" />
              Add photos
            </span>
          </button>
        )}
      </div>
      <input
        ref={input}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/avif,image/heic,image/heif"
        multiple
        hidden
        onChange={(event) => upload(event.target.files)}
      />
      {error && <p className="field-error">{error}</p>}
    </div>
  );
}
