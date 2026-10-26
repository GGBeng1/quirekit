import { Extension, createEditor } from "@quirekit/core";
import { describe, expect, it, vi } from "vitest";
import { createClassicEditorRegistry } from "../plugin";
import { classicEditorPreset } from "../preset";
import type { ClassicEditorActionContext } from "../types";
import { ClassicEditorKit } from "./kit";

describe("Classic history provider injection", () => {
  it("replaces PM history while retaining one standard toolbar and ribbon pair", () => {
    const undo = vi.fn(() => true);
    const redo = vi.fn(() => false);
    const provider = Extension.create({
      name: "testHistoryProvider",
      /** @returns Independently owned standard history commands. */
      addCommands() {
        return { undo: () => () => undo(), redo: () => () => redo() };
      }
    });
    const editor = createEditor({ extensions: [ClassicEditorKit.configure({ historyExtension: provider })] });
    try {
      const registry = createClassicEditorRegistry({
        plugins: classicEditorPreset.plugins ?? [], extensions: editor.extensions,
        features: { table: false, drawing: false, review: false }
      });
      expect(editor.extensions.filter(extension => extension.name === provider.name)).toHaveLength(1);
      expect(editor.extensions.some(extension => extension.name === "undoRedo")).toBe(false);
      expect(editor.state.pm.plugins.some(plugin => plugin.spec.key?.key.startsWith("history$"))).toBe(false);
      for (const id of ["toolbar.undo", "toolbar.redo", "ribbon.undo", "ribbon.redo"]) {
        expect(registry.contributions.filter(item => item.id === id)).toHaveLength(1);
      }
      const action = registry.contributions.find(item => item.id === "ribbon.undo");
      if (action?.kind !== "ribbon-action-control") throw new Error("Missing standard Undo action");
      const context = { editor } as ClassicEditorActionContext;
      expect(action.action.canExecute?.(context)).toBe(true);
      expect(action.action.run(context)).toBe(true);
      expect(undo).toHaveBeenCalledTimes(2);
      expect(editor.can().redo()).toBe(false);
      expect(redo).toHaveBeenCalledExactlyOnceWith();
    } finally { editor.destroy(); }
  });

  it("retains existing disable behavior without a provider", () => {
    const editor = createEditor({ extensions: [ClassicEditorKit.configure({ undoRedo: false })] });
    try {
      const registry = createClassicEditorRegistry({ plugins: classicEditorPreset.plugins ?? [],
        extensions: editor.extensions, features: { table: false, drawing: false, review: false } });
      expect(registry.contributions.some(item => item.id === "toolbar.undo" || item.id === "ribbon.undo")).toBe(false);
    } finally { editor.destroy(); }
  });
});
