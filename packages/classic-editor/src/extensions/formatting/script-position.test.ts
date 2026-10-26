import { createEditor } from "@quirekit/core";
import { describe, expect, it } from "vitest";
import { createClassicEditorRegistry } from "../../plugin";
import { classicEditorPreset } from "../../preset";
import type { ClassicEditorActionContext } from "../../types";
import { ClassicEditorKit } from "../kit";

/** @param disabled - Optional capability to omit. @returns Editor and its public surface records. */
function fixture(disabled?: "superscript" | "subscript") {
  const editor = createEditor({
    extensions: [ClassicEditorKit.configure(disabled ? { [disabled]: false } : {})],
    content: { type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text: "ABC" }] }] }
  });
  const registry = createClassicEditorRegistry({
    plugins: classicEditorPreset.plugins ?? [], extensions: editor.extensions,
    features: { table: false, drawing: false, review: false }
  });
  return { editor, registry };
}

describe("Classic script-position actions", () => {
  it("shares toolbar and popup actions with exclusive reactive state", () => {
    const { editor, registry } = fixture();
    const context = { editor } as unknown as ClassicEditorActionContext;
    editor.commands.setTextSelection({ from: 1, to: 3 });
    for (const name of ["superscript", "subscript"] as const) {
      const ribbon = registry.contributions.find(item => item.id === `ribbon.${name}`);
      if (ribbon?.kind !== "ribbon-action-control") throw new Error(`Missing ${name}`);
      const action = ribbon.action;
      expect(registry.contributions.find(item => item.id === `selection.${name}`))
        .toMatchObject({ kind: "selection-popup-item", action });
      expect(action.icon).toBe(name);
      expect(action.isActive?.(context)).toBe(false);
      expect(action.canExecute?.(context)).toBe(true);
      expect(action.run(context)).toBe(true);
      expect(action.isActive?.(context)).toBe(true);
    }
    expect(editor.isActive("superscript")).toBe(false);
    editor.commands.setTextSelection(3);
    expect(editor.can().toggleSuperscript()).toBe(true);
    expect(editor.isActive("subscript")).toBe(true);
    expect(editor.commands.toggleSuperscript()).toBe(true);
    expect(editor.isActive("superscript")).toBe(true);
    editor.setEditable(false);
    for (const name of ["superscript", "subscript"]) {
      const item = registry.contributions.find(item => item.id === `ribbon.${name}`);
      if (item?.kind === "ribbon-action-control") expect(item.action.canExecute?.(context)).toBe(false);
    }
    editor.destroy();
  });

  it.each(["superscript", "subscript"] as const)("omits disabled %s and keeps its opposite usable", disabled => {
    const { editor, registry } = fixture(disabled);
    expect(editor.schema.marks[disabled]).toBeUndefined();
    expect(registry.contributions.some(item => item.id === `ribbon.${disabled}` || item.id === `selection.${disabled}`)).toBe(false);
    editor.commands.setTextSelection({ from: 1, to: 3 });
    const name = disabled === "subscript" ? "superscript" : "subscript";
    const ribbon = registry.contributions.find(item => item.id === `ribbon.${name}`);
    if (ribbon?.kind !== "ribbon-action-control") throw new Error(`Missing ${name}`);
    expect(ribbon.action.run({ editor } as unknown as ClassicEditorActionContext)).toBe(true);
    expect(editor.isActive(name)).toBe(true);
    editor.destroy();
  });
});
