// @vitest-environment happy-dom
import { createApp, defineComponent, h, nextTick } from "vue";
import { createEditor, Extension } from "@quirekit/core";
import { Plugin } from "@quirekit/pm";
import { expect, it, vi } from "vitest";
import type { ClassicEditorRenderContext } from "@classic/types";
import { ClassicEditorKit } from "../../../kit";
import * as selection from "@classic/extensions/typography/effective-format/selection";
import { useTextPanel } from "../use";

/** @param protectedDocument - Reject persisted edits. @returns Mounted controls with inherited grid participation. */
function fixture(protectedDocument = false) {
  const resolveParagraph = vi.fn(() => ({ characterGrid: false }));
  const inherited = Extension.create({ name: "gridInheritance", priority: 1100,
    /** @returns Inherited paragraph typography. */
    addNodeCanvasTextStyles() { return { paragraph: resolveParagraph }; },
    /** @returns An edit permission filter. */
    addProseMirrorPlugins() { return [new Plugin({ filterTransaction: tr => !protectedDocument || !tr.docChanged })]; }
  });
  const editor = createEditor({ extensions: [inherited, ClassicEditorKit], content: { type: "doc", content: [
    { type: "paragraph", content: [{ type: "text", text: "AB" },
      { type: "text", text: "CD", marks: [{ type: "textStyle", attrs: { characterGrid: true, color: "#123456" } }] }] }
  ] } });
  let panel!: ReturnType<typeof useTextPanel>;
  const app = createApp(defineComponent({ setup() {
    panel = useTextPanel(() => ({ editor, locale: "zh-CN" }) as ClassicEditorRenderContext);
    return () => h("div", String(panel.characterGrid.value));
  } }));
  app.mount(document.createElement("div"));
  return { editor, panel, resolveParagraph, dispose: () => { app.unmount(); editor.destroy(); } };
}

it("projects inherited/mixed grid values, resets only this field and undoes each edit", async () => {
  const collect = vi.spyOn(selection, "collectClassicSelectedTextSegments");
  const { editor, panel, resolveParagraph, dispose } = fixture();
  try {
    expect(panel.characterGrid.value).toBe(false);
    expect(collect).toHaveBeenCalledTimes(1);
    collect.mockClear(); resolveParagraph.mockClear();
    editor.dispatchTransaction(editor.state.pm.tr); await nextTick();
    expect(collect).not.toHaveBeenCalled(); expect(resolveParagraph).not.toHaveBeenCalled();
    editor.commands.setTextSelection({ from: 1, to: 5 }); await nextTick();
    expect(panel.characterGrid.value).toBeUndefined();
    const before = editor.state.doc;
    expect(panel.setCharacterGrid(false)).toBe(true); await nextTick();
    expect(panel.characterGrid.value).toBe(false);
    expect(panel.setCharacterGrid(null)).toBe(true); await nextTick();
    expect(panel.characterGrid.value).toBe(false);
    expect(editor.state.doc.firstChild!.lastChild!.marks[0]!.attrs).toMatchObject({ color: "#123456", characterGrid: null });
    expect(editor.commands.undo()).toBe(true);
    expect(editor.commands.undo()).toBe(true);
    expect(editor.state.doc.eq(before)).toBe(true);
    expect(editor.commands.redo()).toBe(true);
  } finally { dispose(); vi.restoreAllMocks(); }
});

it("writes the caret setting to subsequent text and can restore inheritance", async () => {
  const { editor, panel, dispose } = fixture();
  try {
    editor.commands.setTextSelection(2); await nextTick();
    expect(panel.setCharacterGrid(true)).toBe(true); await nextTick();
    expect(panel.characterGrid.value).toBe(true);
    editor.commands.insertContent("甲");
    expect(editor.state.doc.firstChild!.child(1).marks[0]!.attrs.characterGrid).toBe(true);
    expect(panel.setCharacterGrid(null)).toBe(true); await nextTick();
    expect(panel.characterGrid.value).toBe(false);
  } finally { dispose(); }
});

it.each(["readonly", "protection"])("rejects %s grid changes without partial edits", async mode => {
  const { editor, panel, dispose } = fixture(mode === "protection");
  try {
    editor.commands.setTextSelection({ from: 1, to: 5 });
    if (mode === "readonly") editor.setEditable(false);
    await nextTick();
    const before = editor.state.doc;
    expect(panel.canSetCharacterGrid(false)).toBe(false);
    expect(panel.setCharacterGrid(false)).toBe(false);
    expect(editor.state.doc).toBe(before);
  } finally { dispose(); }
});
