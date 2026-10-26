// @vitest-environment happy-dom
import { createApp, defineComponent, h, nextTick } from "vue";
import { createEditor, Extension } from "@quirekit/core";
import { Plugin } from "@quirekit/pm";
import { expect, it, vi } from "vitest";
import type { ClassicEditorRenderContext } from "@classic/types";
import { ClassicEditorKit } from "../../../kit";
import * as selection from "@classic/extensions/typography/effective-format/selection";
import { useTextPanel } from "../use";

/**
 * @param protectedDocument - Reject persisted edits.
 * @returns Mounted inherited scaling fixture. */
function fixture(protectedDocument = false) {
  const resolveParagraph = vi.fn(() => ({ horizontalScale: 0.8 }));
  const inherited = Extension.create({ name: "inheritedWidth", priority: 1100,
    /**
 * @returns Inherited paragraph typography. */
    addNodeCanvasTextStyles() { return { paragraph: resolveParagraph }; },
    /**
 * @returns Document protection fixture. */
    addProseMirrorPlugins() { return [new Plugin({ filterTransaction: tr => !protectedDocument || !tr.docChanged })]; }
  });
  const editor = createEditor({ extensions: [inherited, ClassicEditorKit], content: { type: "doc", content: [
    { type: "paragraph", content: [{ type: "text", text: "AB" },
      { type: "text", text: "CD", marks: [{ type: "textStyle", attrs: { textScale: 100, color: "#123456" } }] }] }
  ] } });
  let state!: ReturnType<typeof useTextPanel>;
  const app = createApp(defineComponent({ setup() {
    state = useTextPanel(() => ({ editor, locale: "zh-CN" }) as ClassicEditorRenderContext);
    return () => h("div", JSON.stringify([state.scale.value, state.effects.value, state.hidden.value]));
  } }));
  app.mount(document.createElement("div"));
  return { editor, state, resolveParagraph, dispose: () => { app.unmount(); editor.destroy(); } };
}

it("shares one projection and distinguishes inherited 80, explicit 100 and mixed values", async () => {
  const collect = vi.spyOn(selection, "collectClassicSelectedTextSegments");
  const { editor, state, resolveParagraph, dispose } = fixture();
  try {
    expect(state.scale.value).toBe(80);
    expect(collect).toHaveBeenCalledTimes(1);
    expect(resolveParagraph).toHaveBeenCalledTimes(1);
    collect.mockClear(); resolveParagraph.mockClear();
    editor.dispatchTransaction(editor.state.pm.tr); await nextTick();
    expect(collect).not.toHaveBeenCalled(); expect(resolveParagraph).not.toHaveBeenCalled();
    editor.commands.setTextSelection({ from: 1, to: 5 }); await nextTick();
    expect(state.scale.value).toBeNull();
    const before = editor.state.doc;
    expect(state.setScale(100)).toBe(true); await nextTick();
    expect(state.scale.value).toBe(100);
    expect(editor.state.doc.firstChild!.lastChild!.marks[0]!.attrs.color).toBe("#123456");
    expect(state.setScale(null)).toBe(true); await nextTick();
    expect(state.scale.value).toBe(80);
    expect(editor.commands.undo()).toBe(true); await nextTick();
    expect(state.scale.value).toBe(100);
    expect(editor.commands.undo()).toBe(true);
    expect(editor.state.doc.eq(before)).toBe(true);
    expect(editor.commands.redo()).toBe(true); await nextTick();
    expect(state.scale.value).toBe(100);
  } finally { dispose(); vi.restoreAllMocks(); }
});

it("uses caret stored marks for newly typed text", async () => {
  const { editor, state, dispose } = fixture();
  try {
    editor.commands.setTextSelection(2); await nextTick();
    expect(state.setScale(120)).toBe(true); await nextTick();
    expect(state.scale.value).toBe(120);
    editor.commands.insertContent("New");
    expect(editor.state.doc.firstChild!.child(1).marks[0]!.attrs.textScale).toBe(120);
  } finally { dispose(); }
});

it.each(["readonly", "protection"])("rejects %s atomically", async mode => {
  const { editor, state, dispose } = fixture(mode === "protection");
  try {
    editor.commands.setTextSelection({ from: 1, to: 5 });
    if (mode === "readonly") editor.setEditable(false);
    await nextTick();
    const before = editor.state.doc;
    expect(state.setScale(120)).toBe(false);
    expect(editor.state.doc).toBe(before);
  } finally { dispose(); }
});
