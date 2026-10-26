import { describe, expect, it } from "vitest";
import { createQuireEmojiCatalog, createQuireEmojiGroups } from "./catalog";
import { filterQuireEmojis, resolveQuireRecentEmojis } from "./search";
import { en } from "../../locale/components/emoji-picker";
import { resolveQuireKitLocale } from "../../locale/resolve";

describe("portable emoji catalog", () => {
  it("preserves compound Unicode sequences and unique values in both locales", () => {
    const items = createQuireEmojiCatalog();
    expect(new Set(items.map(item => item.value)).size).toBe(items.length);
    expect(createQuireEmojiCatalog(en).map(item => item.value)).toEqual(items.map(item => item.value));
    expect(items.some(item => item.value === "🧑‍💻")).toBe(true);
    const groups = createQuireEmojiGroups().map(group => group.value);
    expect(items.every(item => groups.includes(item.group))).toBe(true);
  });
  it("searches Chinese, English and shortcode aliases across category boundaries", () => {
    const items = createQuireEmojiCatalog();
    expect(filterQuireEmojis(items, "咖啡", "faces").map(item => item.value)).toEqual(["☕"]);
    expect(filterQuireEmojis(items, ":coffee:").map(item => item.value)).toEqual(["☕"]);
    expect(filterQuireEmojis(items, "red HEART").map(item => item.value)).toEqual(["❤️"]);
    expect(filterQuireEmojis(items, "unknown emoji")).toEqual([]);
    expect(filterQuireEmojis(items, "", "food").every(item => item.group === "food")).toBe(true);
  });
  it("keeps both built-in languages searchable whatever the display language", () => {
    const items = createQuireEmojiCatalog(en);
    expect(items.find(item => item.value === "☕")?.label).toBe("coffee");
    expect(filterQuireEmojis(items, "咖啡").map(item => item.value)).toEqual(["☕"]);
  });
  it("falls back to English names and groups for an added language without emoji names", () => {
    const { messages } = resolveQuireKitLocale("fr", [{ code: "fr", messages: { emojiPicker: { search: "Rechercher" } } }]);
    const items = createQuireEmojiCatalog(messages.emojiPicker);
    expect(items.find(item => item.value === "☕")?.label).toBe("coffee");
    expect(createQuireEmojiGroups(messages.emojiPicker)[0]?.label).toBe("Faces and people");
    const partial = { ...messages.emojiPicker, names: { "☕": "café" } };
    expect(createQuireEmojiCatalog(partial).find(item => item.value === "🍵")?.label).toBe("tea");
    expect(filterQuireEmojis(createQuireEmojiCatalog(partial), "café").map(item => item.value)).toEqual(["☕"]);
  });
  it("leaves persistence with the host and ignores stale recent entries", () => {
    const recent = ["☕", "unknown", "😀", "☕"];
    expect(resolveQuireRecentEmojis(createQuireEmojiCatalog(), recent).map(item => item.value)).toEqual(["☕", "😀"]);
    expect(recent).toHaveLength(4);
  });
});
