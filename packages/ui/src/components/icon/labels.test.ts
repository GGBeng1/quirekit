import { describe, expect, it } from "vitest";
import { quireKitEn } from "../../locale/packs/en";
import { quireKitEditorIconGroups } from "./metadata";
import { getQuireKitEditorIconGroups } from "./labels";
import { getQuireKitEditorIconCatalog, quireKitEditorIconCatalog } from "./catalog";

const han = /\p{Script=Han}/u;

describe("icon catalog labels", () => {
  it("keeps the generated metadata free of display text", () => {
    for (const group of quireKitEditorIconGroups) {
      expect("label" in group).toBe(false);
      for (const icon of group.icons) expect("label" in icon).toBe(false);
    }
  });

  it("labels groups and icons in Chinese by default", () => {
    const groups = getQuireKitEditorIconGroups();
    expect(groups[0]).toMatchObject({ id: "chevrons", label: "折叠与翻页" });
    expect(groups[0]?.icons[0]).toMatchObject({ name: "chevronLeft", upstream: "chevron-left", label: "向左" });
    expect(quireKitEditorIconCatalog).toBe(getQuireKitEditorIconCatalog());
    expect(quireKitEditorIconCatalog.find(entry => entry.name === "close")?.keywords)
      .toEqual(expect.arrayContaining(["关闭", "清除", "常用操作"]));
  });

  it("labels every group and icon in English without Han text", () => {
    const messages = quireKitEn.messages.iconCatalog;
    const groups = getQuireKitEditorIconGroups(messages);
    expect(groups[0]?.icons[0]?.label).toBe("Left");
    for (const group of groups) {
      expect(group.label).not.toMatch(han);
      for (const icon of group.icons) {
        expect(icon.label.length).toBeGreaterThan(0);
        expect(icon.label).not.toMatch(han);
      }
    }
    const catalog = getQuireKitEditorIconCatalog(messages);
    expect(catalog.map(entry => entry.name)).toEqual(quireKitEditorIconCatalog.map(entry => entry.name));
    for (const entry of catalog) expect(entry.keywords.join(" ")).not.toMatch(han);
    expect(catalog.find(entry => entry.name === "fillColor")?.keywords)
      .toEqual(expect.arrayContaining(["Fill color", "shading", "Character formatting", "tableCellFill"]));
    expect(getQuireKitEditorIconCatalog(messages)).toBe(catalog);
  });
});
