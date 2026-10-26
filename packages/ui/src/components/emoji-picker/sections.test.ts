import { describe, expect, it } from "vitest";
import { createQuireEmojiCatalog, createQuireEmojiGroups } from "./catalog";
import { createEmojiSections } from "./sections";
import { en, zhCN } from "../../locale/components/emoji-picker";

describe("continuous emoji sections", () => {
  it("starts with common shortcuts and keeps every category in one ordered collection", () => {
    const items = createQuireEmojiCatalog(), groups = createQuireEmojiGroups();
    const sections = createEmojiSections(items, groups, zhCN);
    expect(sections[0]?.label).toBe("常用");
    expect(sections[0]?.items).toHaveLength(10);
    expect(sections.slice(1).map(section => section.label)).toEqual(groups.map(group => group.label));
    expect(sections.slice(1).flatMap(section => section.items)).toEqual(items);
  });
  it("keeps host common and recent ordering without adding unknown or duplicate choices", () => {
    const sections = createEmojiSections(createQuireEmojiCatalog(en), createQuireEmojiGroups(en), en,
      ["🧑‍💻", "unknown", "🧑‍💻", "✅"], ["☕", "☕", "unknown"]);
    expect(sections[0]?.items.map(item => item.value)).toEqual(["🧑‍💻", "✅"]);
    expect(sections[1]?.items.map(item => item.value)).toEqual(["☕"]);
    expect(sections.slice(0, 2).map(section => section.label)).toEqual(["Common", "Recently used"]);
  });
  it("supports empty shortcuts and custom category names without collisions or unreachable items", () => {
    const sections = createEmojiSections([
      { value: "😀", label: "Smile", group: "recent" }, { value: "☕", label: "Coffee", group: "unlisted" },
    ], [{ value: "recent", label: "Work", icon: "briefcase" }], en, [], ["😀"]);
    expect(sections.map(section => section.key)).toEqual(["recent", "category:recent", "ungrouped"]);
    expect(sections[2]?.items.map(item => item.value)).toEqual(["☕"]);
    expect(createEmojiSections([], [], en)).toEqual([]);
  });
});
