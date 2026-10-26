import { createEditor, Extension, Node } from "@quirekit/core";
import { StarterKit } from "@quirekit/starter-kit";
import { describe, expect, it, vi } from "vitest";
import type {} from "../contract";
import { compileAccessibilityRegistry } from "./registry";

describe("extension-owned accessibility registry", () => {
  it("uses inherited factories and configured options without a special node name", () => {
    const base = Node.create<{ level: number }>({ name: "customTitle", group: "block", content: "inline*",
      addOptions() { return { level: 2 }; },
      addAccessibility() { return [{ kind: "node", name: this.name,
        describe: () => ({ kind: "heading", level: this.options.level, editable: true }) }]; }
    });
    const factory = vi.fn();
    const extension = base.extend({ addAccessibility(context) { factory(); return this.parent?.(context) ?? []; } }).configure({ level: 3 });
    const editor = createEditor({ extensions: [StarterKit, extension], content: { type: "doc", content: [{ type: "customTitle" }] } });
    expect(factory).not.toHaveBeenCalled();
    const registry = compileAccessibilityRegistry(editor.state.extensions, editor.state.schema);
    expect(registry.node(editor.state.doc.firstChild!)).toEqual({ kind: "heading", level: 3, editable: true });
    expect(factory).toHaveBeenCalledTimes(1);
    editor.destroy();
  });

  it("admits Feature-owned semantics, rejecting conflicting or missing schema owners", () => {
    const custom = Node.create({ name: "customBlock", group: "block", atom: true });
    const feature = Extension.create({ name: "customSemantics", addAccessibility() {
      return [{ kind: "node", name: "customBlock", describe: () => ({ kind: "description", label: "Custom object" }) }];
    } });
    const editor = createEditor({ extensions: [StarterKit, custom, feature] });
    const registry = compileAccessibilityRegistry(editor.state.extensions, editor.state.schema);
    expect(registry.node(editor.state.schema.nodes.customBlock!.create())?.kind).toBe("description");
    expect(() => compileAccessibilityRegistry([...editor.state.extensions, feature.extend({ name: "conflict" })], editor.state.schema)).toThrow(/customBlock.*customSemantics.*conflict/);
    const other = createEditor({ extensions: [StarterKit] });
    expect(() => compileAccessibilityRegistry([feature], other.state.schema)).toThrow(/customBlock.*schema/);
    other.destroy();
    editor.destroy();
  });
});
