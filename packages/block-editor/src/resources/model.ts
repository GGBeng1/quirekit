import type { BlockResource } from "../rich-content/types";
import { resourceURL } from "../rich-content/urls";
/** @param value - Untrusted resource list. @param family - Required media prefix. @returns Whether persistent content is complete. */
export function validResources(value: unknown, family?: string): value is BlockResource[] {
  if (!Array.isArray(value) || value.length < 1 || value.length > 24) return false;
  const ids = new Set<string>();
  return value.every(item => {
    if (!item || typeof item.id !== "string" || !item.id || ids.has(item.id) || typeof item.name !== "string"
      || !item.name.trim() || typeof item.mime !== "string" || !resourceURL(item.src, item.mime)
      || family && !item.mime.startsWith(family)
      || item.size !== undefined && (!Number.isFinite(item.size) || item.size < 0)
      || item.alt !== undefined && typeof item.alt !== "string") return false;
    ids.add(item.id); return true;
  });
}
