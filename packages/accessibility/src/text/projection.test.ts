import { createEditor, Node, type QuireEditor } from "@quirekit/core";
import { StarterKit } from "@quirekit/starter-kit";
import { describe, expect, it } from "vitest";
import { projectTextContext } from "./projection";
import { compileAccessibilityRegistry } from "../registry/registry";

/** @param editor - Test editor. @param budget - Text bound. @returns Engine projection using actual contributions. */
function project(editor: QuireEditor, budget: number) {
  return projectTextContext(editor.state.pm, budget, compileAccessibilityRegistry(editor.state.extensions, editor.state.schema));
}

describe("bounded text context", () => {
  it("rejects unknown and isolated ancestors even when their child paragraph contributes semantics", () => {
    const wrapper = Node.create({ name: "unknownWrapper", group: "block", content: "block+" });
    const isolated = wrapper.extend({ name: "isolatedWrapper", isolating: true, addAccessibility() {
      return [{ kind: "node", name: this.name, describe: () => ({ kind: "group", textNavigation: true }) }];
    } });
    for (const extension of [wrapper, isolated]) {
      const editor = createEditor({ extensions: [StarterKit, extension], content: { type: "doc", content: [
        { type: extension.name, content: [{ type: "paragraph", content: [{ type: "text", text: "protected" }] }] }
      ] } });
      editor.commands.setTextSelection(3);
      expect(project(editor, 32)).toBeNull();
      editor.destroy();
    }
  });

  it("preserves backward UTF-16 selection across marks, emoji and bidi text", () => {
    const editor = createEditor({ extensions: [StarterKit], content: { type: "doc", content: [{ type: "paragraph", content: [
      { type: "text", text: "A😀é" }, { type: "text", text: "עברית", marks: [{ type: "bold" }] }
    ] }] } });
    editor.commands.setTextSelection({ from: 10, to: 2 });
    const context = project(editor, 32)!;
    expect(context.text).toBe("A😀éעברית");
    expect(context.positions[context.anchor]).toBe(10);
    expect(context.positions[context.head]).toBe(2);
    expect(context.anchor).toBeGreaterThan(context.head);
    editor.destroy();
  });

  it("bounds very long text without splitting emoji and refuses incomplete selections", () => {
    const editor = createEditor({ extensions: [StarterKit], content: { type: "doc", content: [
      { type: "paragraph", content: [{ type: "text", text: "😀".repeat(10000) }] }
    ] } });
    editor.commands.setTextSelection(10001);
    const context = project(editor, 33)!;
    expect(context.text.length).toBeLessThanOrEqual(33);
    expect(context.text).toMatch(/^(?:😀)+$/u);
    editor.commands.setTextSelection({ from: 1, to: 100 });
    expect(project(editor, 32)).toBeNull();
    expect(editor.state.pm.selection.to).toBe(100);
    editor.destroy();
  });

  it("maps contributed hard breaks and nested ordinary text, refusing cross-paragraph ranges", () => {
    const editor = createEditor({ extensions: [StarterKit], content: { type: "doc", content: [
      { type: "paragraph", content: [{ type: "text", text: "a" }, { type: "hardBreak" }, { type: "text", text: "b" }] },
      { type: "paragraph", content: [{ type: "text", text: "next" }] },
      { type: "blockquote", content: [{ type: "paragraph", content: [{ type: "text", text: "nested" }] }] }
    ] } });
    expect(project(editor, 32)?.text).toBe("a\nb");
    editor.commands.setTextSelection({ from: 2, to: 7 });
    expect(project(editor, 32)).toBeNull();
    editor.commands.setTextSelection(13);
    expect(project(editor, 32)?.text).toBe("nested");
    editor.destroy();
  });
});
