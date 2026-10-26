import { filterQuireEmojis, resolveQuireRecentEmojis } from "./search";
import type { Messages as QuireKitEmojiPickerMessages } from "../../locale/components/emoji-picker";
import { quireKitDefaultLocale } from "../../locale/resolve";
import type { QuireKitEmojiGroup, QuireKitEmojiItem, QuireKitEmojiSection } from "./types";

const commonValues = ["💡", "⭐", "📌", "🚫", "✅", "❌", "❗", "📅", "🎉", "📣"];

/**
 * Builds stable continuous sections without confusing shortcuts with catalog ownership.
 * @param items - Host or default catalog.
 * @param groups - Preferred category order.
 * @param messages - EmojiPicker text of the active language for shortcut and fallback labels.
 * @param common - Optional common shortcuts; empty hides them.
 * @param recent - Host-owned recent values.
 * @returns Nonempty sections with each catalog item still available in its category.
 */
export function createEmojiSections(items: readonly QuireKitEmojiItem[], groups: readonly QuireKitEmojiGroup[],
  messages: QuireKitEmojiPickerMessages = quireKitDefaultLocale.messages.emojiPicker, common: readonly string[] = commonValues,
  recent: readonly string[] = []): readonly QuireKitEmojiSection[] {
  const catalog = filterQuireEmojis(items, "");
  const sections: QuireKitEmojiSection[] = [];
  const shortcuts = [
    { key: "common", label: messages.common, icon: "star", values: common },
    { key: "recent", label: messages.recent, icon: "history", values: recent },
  ];
  for (const shortcut of shortcuts) {
    const resolved = resolveQuireRecentEmojis(catalog, shortcut.values);
    if (resolved.length) sections.push({ key: shortcut.key, label: shortcut.label, icon: shortcut.icon, items: resolved });
  }
  const admitted = new Set<string>();
  for (const group of groups) {
    if (admitted.has(group.value)) continue;
    admitted.add(group.value);
    const members = catalog.filter(item => item.group === group.value);
    if (members.length) sections.push({ key: `category:${group.value}`, label: group.label, icon: group.icon, items: members });
  }
  const remaining = catalog.filter(item => !admitted.has(item.group));
  if (remaining.length) sections.push({ key: "ungrouped", label: messages.other, icon: "ellipsis", items: remaining });
  return sections;
}
