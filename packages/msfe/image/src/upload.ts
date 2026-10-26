import { encodeMarkdownField, isSafeDestination } from "@quirekit/msfe-core";
import type { ImageUploader, ImageUploadSource } from "./types";

/** Image types accepted from paste, drop and file pickers. */
export const imageUploadTypes = ["image/png", "image/jpeg", "image/gif", "image/webp", "image/svg+xml"];

/** @param name - Original file name. @returns Alternative text: the base name, or empty for generic clipboard names. */
export function imageAlt(name: string | undefined): string {
  const base = (name ?? "").replace(/\.[^.]+$/u, "").replace(/[\r\n]+/gu, " ").trim();
  return /^(image|图片|截图|screenshot)$/iu.test(base) ? "" : base.slice(0, 120);
}

/** @param file - Image bytes. @returns The image as a `data:` URL. */
function inlineImage(file: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error ?? new Error("image-read-failed"));
    reader.readAsDataURL(file);
  });
}

/**
 * Stores images one after another and builds their Markdown, skipping failures.
 * Without an uploader each image is inlined; types outside the safe inline set (SVG) are skipped.
 * @param uploader - Host storage, or undefined to inline.
 * @param files - Image files in input order.
 * @param source - Entry point.
 * @param signal - Editor lifetime.
 * @returns Inline image source joined by spaces; empty when nothing was stored.
 */
export async function storeImages(uploader: ImageUploader | undefined, files: readonly File[], source: ImageUploadSource, signal: AbortSignal): Promise<string> {
  const parts: string[] = [];
  for (const file of files) {
    try {
      const url = uploader ? await uploader.upload(file, { signal, source, name: file.name }) : await inlineImage(file);
      if (signal.aborted) break;
      // Host addresses and inline data both pass the same image destination rule before entering source.
      if (isSafeDestination(url, true)) parts.push(`![${encodeMarkdownField(imageAlt(file.name), "[]*_`<>")}](<${encodeMarkdownField(url, "<>")}>)`);
    } catch { if (signal.aborted) break; /* The host reports its own failure; this image is skipped. */ }
  }
  return parts.join(" ");
}
