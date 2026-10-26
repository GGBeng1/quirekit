import { describe, expect, it } from "vitest";
import type { ClassicEditorContextMenuItemContribution } from "@classic/types";
import { filterClassicEditorContextMenuRoles } from "./behavior-surface-options";

/**
 * Creates a minimal behavior-backed context-menu item.
 * @param id - Contribution id.
 * @param role - Optional competition role.
 * @returns Context-menu contribution.
 */
function item(
  id: string,
  role?: ClassicEditorContextMenuItemContribution["role"],
  extra: Partial<ClassicEditorContextMenuItemContribution> = {}
): ClassicEditorContextMenuItemContribution {
  return { kind: "context-menu-item", id, label: id, role, behavior: { execute: () => true }, ...extra };
}

describe("context-menu roles", () => {
  it("keeps the generic text menu and additions when no object owns the target", () => {
    const items = [item("spelling"), item("copy", "fallback")];
    expect(filterClassicEditorContextMenuRoles(items).map(entry => entry.id)).toEqual(["spelling", "copy"]);
  });

  it("hides fallback rows when an object menu applies, keeping additions", () => {
    const items = [item("spelling", "addition"), item("copy", "fallback"), item("table.merge", "target")];
    expect(filterClassicEditorContextMenuRoles(items).map(entry => entry.id)).toEqual(["spelling", "table.merge"]);
  });

  it("keeps the fallback sections an object menu asks for", () => {
    const items = [
      item("copy", "fallback", { section: "clipboard" }),
      item("font", "fallback", { section: "format" }),
      item("table.merge", "target", { section: "table", keepFallbackSections: ["clipboard"] })
    ];
    expect(filterClassicEditorContextMenuRoles(items).map(entry => entry.id)).toEqual(["copy", "table.merge"]);
  });
});
