// @vitest-environment happy-dom
import { createApp, defineComponent, h, nextTick } from "vue";
import { createEditor, Extension, Mark } from "@quirekit/core";
import { Plugin } from "@quirekit/pm";
import { expect, it, vi } from "vitest";
import type { ClassicEditorRenderContext } from "@classic/types";
import { ClassicEditorKit } from "../../../kit";
import * as selection from "@classic/extensions/typography/effective-format/selection";
import { useTextPanel } from "../use";

/** @param protectedDocument - Reject document changes. @returns A mounted real selection controller. */
function fixture(protectedDocument = false) {
  const inherited = Extension.create({ name: "inheritedEffect", priority: 1100,
    /** @returns Node-level effect inheritance. */
    addNodeCanvasTextStyles() { return { paragraph: () => ({ glyphEffects: ["shadow"] }) }; },
    /** @returns Test protection filter. */
    addProseMirrorPlugins() { return [new Plugin({ filterTransaction: tr => !protectedDocument || !tr.docChanged })]; }
  });
  const semantic = Mark.create({ name: "semanticEffect", priority: 200,
    /** @returns Character-style appearance. */
    canvasStyle() { return { cascade: "inherited", glyphEffects: ["emboss"] }; }
  });
  const editor = createEditor({ extensions: [inherited, semantic, ClassicEditorKit], content: { type: "doc", content: [
    { type: "paragraph", content: [{ type: "text", text: "AB", marks: [{ type: "textStyle", attrs: { outline: true, color: "#123456" } }] }, { type: "text", text: "CD" }] },
    { type: "paragraph", content: [{ type: "text", text: "EF", marks: [{ type: "semanticEffect" }] }] }
  ] } });
  let state!: ReturnType<typeof useTextPanel>;
  const app = createApp(defineComponent({ setup() {
    state = useTextPanel(() => ({ editor, locale: "zh-CN" }) as ClassicEditorRenderContext);
    return () => h("div", JSON.stringify(state.effects.value));
  } }));
  app.mount(document.createElement("div"));
  return { editor, state, dispose: () => { app.unmount(); editor.destroy(); } };
}

it("projects inherited and direct flags once, reads mixed values and uses independent undo", async () => {
  const collect = vi.spyOn(selection, "collectClassicSelectedTextSegments");
  const { editor, state, dispose } = fixture();
  try {
    expect(state.effects.value).toEqual({ outline: true, shadow: true, emboss: false, imprint: false });
    expect(collect).toHaveBeenCalledTimes(1);
    collect.mockClear(); editor.dispatchTransaction(editor.state.pm.tr); await nextTick();
    expect(collect).not.toHaveBeenCalled();
    editor.commands.setTextSelection({ from: 1, to: 5 }); await nextTick();
    expect(state.effects.value.outline).toBeUndefined();
    expect(state.effects.value.shadow).toBe(true);
    const before = editor.state.doc;
    expect(state.setEffect("shadow", false)).toBe(true); await nextTick();
    expect(state.effects.value.shadow).toBe(false);
    expect(editor.state.doc.firstChild!.firstChild!.marks[0]!.attrs.color).toBe("#123456");
    expect(state.setEffect("outline", true)).toBe(true);
    expect(editor.commands.undo()).toBe(true); await nextTick();
    expect(state.effects.value.outline).toBeUndefined();
    expect(editor.commands.undo()).toBe(true);
    expect(editor.state.doc.eq(before)).toBe(true);
  } finally { dispose(); vi.restoreAllMocks(); }
});

it("turns off inherited emboss atomically when enabling imprint, and preserves the style identity", async () => {
  const { editor, state, dispose } = fixture();
  try {
    editor.commands.setTextSelection({ from: 7, to: 9 }); await nextTick();
    expect(state.effects.value.emboss).toBe(true);
    const before = editor.state.doc;
    expect(state.setEffect("imprint", true)).toBe(true); await nextTick();
    expect(state.effects.value).toEqual({ outline: false, shadow: false, emboss: false, imprint: true });
    expect(editor.getAttributes("textStyle")).toMatchObject({ emboss: false, imprint: true });
    expect(editor.state.doc.child(1).firstChild!.marks.map(mark => mark.type.name)).toContain("semanticEffect");
    expect(editor.commands.undo()).toBe(true); expect(editor.state.doc.eq(before)).toBe(true);
  } finally { dispose(); }
});

it.each(["readonly", "protection"])("rejects %s before changing the document", async mode => {
  const { editor, state, dispose } = fixture(mode === "protection");
  try {
    editor.commands.setTextSelection({ from: 1, to: 5 });
    if (mode === "readonly") editor.setEditable(false);
    await nextTick();
    const before = editor.state.doc;
    expect(state.canSetEffect("outline", true)).toBe(false);
    expect(state.setEffect("outline", true)).toBe(false);
    expect(editor.state.doc).toBe(before);
  } finally { dispose(); }
});
