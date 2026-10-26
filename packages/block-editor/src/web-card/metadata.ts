import { webURL, resourceURL } from "../rich-content/urls";
import type { BlockLinkTarget } from "../links/types";
import type { BlockWebLinkMetadata } from "./types";

/** @param value - Optional authored image. @returns A portable image source or an empty fallback. */
export function webImageURL(value: unknown): string {
  return typeof value === "string" && (webURL(value) || /^data:image\/(?:png|jpeg|gif|webp|svg\+xml);base64,/u.test(value) && resourceURL(value)) ? value : "";
}

/** @param value - Persisted or host-provided metadata. @returns Valid normalized metadata, never guessed remote content. */
export function readWebMetadata(value: unknown): BlockWebLinkMetadata | null {
  if (!value || typeof value !== "object") return null;
  const source = value as Record<string, unknown>, url = webURL(source.url);
  if (!url) return null;
  return {
    url, title: typeof source.title === "string" ? source.title : "",
    description: typeof source.description === "string" ? source.description : "",
    icon: webImageURL(source.icon), cover: webImageURL(source.cover),
    height: Number.isFinite(source.height) ? Math.max(160, Math.min(800, Number(source.height))) : 360
  };
}

/** @param target - One complete inline occurrence. @returns Its current metadata, discarding data from an old URL. */
export function inlineWebMetadata(target: BlockLinkTarget): BlockWebLinkMetadata | null {
  if (!target.range) return null;
  const url = webURL(target.range.href);
  if (!url) return null;
  const mark = target.doc.nodeAt(target.range.from)?.marks.find(item => item.type.name === "link");
  const stored = readWebMetadata(mark?.attrs.web);
  return stored?.url === url ? stored : readWebMetadata({ url, title: webURL(target.text) === url ? "" : target.text });
}

/** @param metadata - Current portable information. @returns A readable title without fabricating metadata. */
export function webLinkTitle(metadata: BlockWebLinkMetadata): string {
  return metadata.title || new URL(metadata.url).hostname;
}
