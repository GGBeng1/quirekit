import { MapMode, type ChangeDesc } from "@quirekit/cm-state";
import type { TableLayoutCache } from "./types";

/**
 * Keep mounted table geometry attached to its source, not to a document-wide revision.
 * @param cache - Only currently retained tables.
 * @param changes - The accepted local change description.
 */
export function mapTableLayoutCache(cache: Map<string, TableLayoutCache>, changes: ChangeDesc): void {
  if (changes.empty) return;
  const mapped = new Map<string, TableLayoutCache>();
  for (const value of cache.values()) {
    const from = changes.mapPos(value.from, 1, MapMode.TrackDel), to = changes.mapPos(value.to, -1);
    if (from === null || from >= to || changes.touchesRange(value.from, value.to) === "cover") continue;
    mapped.set(String(from), { ...value, from, to, dirty: value.dirty || !!changes.touchesRange(value.from, value.to) });
  }
  cache.clear();
  for (const [key, value] of mapped) cache.set(key, value);
}
