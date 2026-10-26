import type { QuireKitEmojiItem } from "./types";

/** @param items - Host or default catalog. @param query - Unicode, label or shortcode query. @param group - Optional category. @returns Stable filtered values, never modifying host data. */
export function filterQuireEmojis(items: readonly QuireKitEmojiItem[], query: string, group?: string): readonly QuireKitEmojiItem[] {
  const terms = query.normalize("NFKC").toLocaleLowerCase().replace(/:/gu, "").trim().split(/\s+/u).filter(Boolean);
  const seen = new Set<string>();
  return items.filter(item => {
    if (!item.value || seen.has(item.value)) return false;
    seen.add(item.value);
    if (!terms.length) return !group || item.group === group;
    const searchable = [item.value, item.label, ...(item.keywords ?? [])].join(" ").normalize("NFKC").toLocaleLowerCase();
    return terms.every(term => searchable.includes(term));
  });
}

/** @param items - Admitted catalog. @param recent - Host-owned recent Unicode values. @returns Deduplicated recent items without inventing missing labels. */
export function resolveQuireRecentEmojis(items: readonly QuireKitEmojiItem[], recent: readonly string[]): readonly QuireKitEmojiItem[] {
  const lookup = new Map(items.map(item => [item.value, item]));
  return [...new Set(recent)].flatMap(value => lookup.get(value) ?? []);
}
