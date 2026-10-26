import type { SourceDocument, SourceNode, SourceEdit } from "@quirekit/msfe-core";
import { isSafeDestination, readSourceDestination, patchSourceDestination } from "@quirekit/msfe-core";
import { imageDescription } from "./description";
import type { ImageSource } from "./types";

/** @param state - Canonical source. @param node - Confirmed image. @returns Supported semantic fields. */
export function readImage(state: SourceDocument, node: SourceNode): ImageSource | null {
  const destination = readSourceDestination(state, node);
  return destination && isSafeDestination(destination.url, true) ? { url: destination.url,
    alt: imageDescription(state, node, destination.labelFrom, destination.labelTo), title: destination.title } : null;
}

/**
 * Patches the selected usage only, retaining untouched inline fields exactly.
 * @param state - Canonical state. @param node - Current image syntax. @param patch - Decoded field edits.
 * @returns Local changes, or refusal for unsafe/unsupported fields.
 */
export function patchImage(state: SourceDocument, node: SourceNode, patch: Partial<ImageSource>): readonly SourceEdit[] | null {
  if (Object.keys(patch).some(key => !["url", "alt", "title"].includes(key))
    || (patch.url !== undefined && (typeof patch.url !== "string" || !isSafeDestination(patch.url, true)))) return null;
  return patchSourceDestination(state, node, {
    ...(patch.url === undefined ? {} : { url: patch.url }),
    ...(patch.alt === undefined ? {} : { label: patch.alt }),
    ...(patch.title === undefined ? {} : { title: patch.title }),
  });
}

/** @param document - Canonical source. @param node - Image usage. @returns Local source plus external reference dependencies for resource/callback invalidation. */
export function imageFingerprint(document: SourceDocument, node: SourceNode): string {
  return JSON.stringify([document.slice(node.from, node.to), readImage(document, node)]);
}
