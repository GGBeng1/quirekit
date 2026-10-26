// @vitest-environment happy-dom
import { createApp, defineComponent, h, nextTick } from "vue";
import { createEditor, Extension, Mark } from "@quirekit/core";
import { Plugin } from "@quirekit/pm";
import { expect, it, vi } from "vitest";
import type { ClassicEditorRenderContext } from "@classic/types";
import { ClassicEditorKit } from "../../../kit";
import * as selection from "@classic/extensions/typography/effective-format/selection";
import { useTextPanel } from "../use";

/** @param protectedDocument - Reject persisted edits. @returns Mounted selection state with inherited hidden text. */
function fixture(protectedDocument = false) {
  const resolveParagraph = vi.fn(() => ({ hidden: true, glyphEffects: ["shadow"] as const }));
  const inherited = Extension.create({ name: "inheritedHidden", priority: 1100,
    /** @returns Inherited paragraph typography. */
    addNodeCanvasTextStyles() { return { paragraph: resolveParagraph }; },
    /** @returns Document protection fixture. */
    addProseMirrorPlugins() { return [new Plugin({ filterTransaction: tr => !protectedDocument || !tr.docChanged })]; }
  });
  const semantic = Mark.create({ name: "visibleCharacterStyle", priority: 200,
    /** @returns A semantic character override. */
    canvasStyle() { return { cascade: "inherited", hidden: false }; }
  });
  const editor = createEditor({ extensions: [inherited, semantic, ClassicEditorKit], content: { type: "doc", content: [
    { type: "paragraph", content: [{ type: "text", text: "AB" },
      { type: "text", text: "CD", marks: [{ type: "textStyle", attrs: { hidden: false, color: "#123456" } }] }] },
    { type: "paragraph", content: [{ type: "text", text: "EF", marks: [{ type: "visibleCharacterStyle" }] }] }
  ] } });
  let state!: ReturnType<typeof useTextPanel>;
  const app = createApp(defineComponent({ setup() {
    state = useTextPanel(() => ({ editor, locale: "zh-CN" }) as ClassicEditorRenderContext);
    return () => h("div", JSON.stringify([state.hidden.value, state.effects.value]));
  } }));
  app.mount(document.createElement("div"));
  return { editor, state, resolveParagraph, dispose: () => { app.unmount(); editor.destroy(); } };
}

it("shares style projection, preserves explicit false and applies mixed selections with independent undo", async () => {
  const collect = vi.spyOn(selection, "collectClassicSelectedTextSegments");
  const { editor, state, resolveParagraph, dispose } = fixture();
  try {
    expect(state.hidden.value).toBe(true);
    expect(state.effects.value.shadow).toBe(true);
    expect(collect).toHaveBeenCalledTimes(1);
    expect(resolveParagraph).toHaveBeenCalledTimes(1);
    collect.mockClear(); resolveParagraph.mockClear();
    editor.dispatchTransaction(editor.state.pm.tr); await nextTick();
    expect(collect).not.toHaveBeenCalled(); expect(resolveParagraph).not.toHaveBeenCalled();
    editor.commands.setTextSelection({ from: 1, to: 5 }); await nextTick();
    expect(state.hidden.value).toBeUndefined();
    const before = editor.state.doc;
    expect(state.setHidden(false)).toBe(true); await nextTick();
    expect(state.hidden.value).toBe(false);
    expect(editor.state.doc.firstChild!.lastChild!.marks[0]!.attrs.color).toBe("#123456");
    expect(state.setHidden(true)).toBe(true); await nextTick();
    expect(state.hidden.value).toBe(true);
    expect(editor.commands.undo()).toBe(true); await nextTick();
    expect(state.hidden.value).toBe(false);
    expect(editor.commands.undo()).toBe(true);
    expect(editor.state.doc.eq(before)).toBe(true);
    editor.commands.setTextSelection({ from: 7, to: 9 }); await nextTick();
    expect(state.hidden.value).toBe(false);
    expect(editor.state.doc.child(1).firstChild!.marks[0]!.type.name).toBe("visibleCharacterStyle");
  } finally { dispose(); vi.restoreAllMocks(); }
});

it("reads caret stored marks and writes an explicit unhide override for subsequent typing", async () => {
  const { editor, state, dispose } = fixture();
  try {
    editor.commands.setTextSelection(2); await nextTick();
    expect(state.hidden.value).toBe(true);
    expect(state.setHidden(false)).toBe(true); await nextTick();
    expect(state.hidden.value).toBe(false);
    editor.commands.insertContent("Visible");
    expect(editor.state.doc.firstChild!.child(1).marks[0]!.attrs.hidden).toBe(false);
  } finally { dispose(); }
});

it.each(["readonly", "protection"])("rejects %s without applying any hidden format", async mode => {
  const { editor, state, dispose } = fixture(mode === "protection");
  try {
    editor.commands.setTextSelection({ from: 1, to: 5 });
    if (mode === "readonly") editor.setEditable(false);
    await nextTick();
    const before = editor.state.doc;
    expect(state.canSetHidden(false)).toBe(false);
    expect(state.setHidden(false)).toBe(false);
    expect(editor.state.doc).toBe(before);
  } finally { dispose(); }
});
