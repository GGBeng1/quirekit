// @vitest-environment happy-dom
import { Extension, QuireEditor } from "@quirekit/core";
import { Plugin, TextSelection } from "@quirekit/pm";
import { StarterKit } from "@quirekit/starter-kit";
import { WordParagraph, applyWordParagraphDecoration, defaultWordParagraphBorderPen as pen,
  defaultWordParagraphFormatting as base, resolveWordParagraphFormatting } from "@quirekit/classic-paragraph-model";
import { describe, expect, it } from "vitest";
import { WordStyles } from "../extension";
import { createDefaultWordParagraphStyleRegistry, resolveWordParagraphAppearance } from "../model";

/** @param extra - Optional protection extension. @returns Two independently styled paragraphs. */
function editorWithStyles(extra: Extension[] = []): QuireEditor {
  const registry = createDefaultWordParagraphStyleRegistry();
  const border = applyWordParagraphDecoration(base, base, { kind: "preset", preset: "bottom", pen });
  return new QuireEditor({
    extensions: [StarterKit, WordParagraph, WordStyles, ...extra],
    content: { type: "doc", attrs: { wordStyleRegistry: { ...registry, styles: {
      ...registry.styles, Normal: { ...registry.styles.Normal!, paragraph: { borders: border.borders } }
    } } }, content: [
      { type: "paragraph", content: [{ type: "text", text: "alpha" }] },
      { type: "paragraph", attrs: { wordParagraph: { ...border,
        borders: { ...border.borders!, bottom: { ...border.borders!.bottom!, spacePoints: 7 } },
        preservation: { litAstAttrs: { untouched: true } } } }, content: [{ type: "text", text: "beta" }] }
    ] }
  });
}

describe("style-aware paragraph decoration commands", () => {
  it("groups continuous values, probes without ending the edit, and isolates later typing", () => {
    const editor = editorWithStyles();
    const before = editor.state.doc;
    editor.commands.setWordParagraphDecoration({ kind: "border", patch: { spacePoints: 1 } });
    expect(editor.can().finishWordParagraphDecorationEdit()).toBe(true);
    editor.commands.setWordParagraphDecoration({ kind: "border", patch: { spacePoints: 20 } }, { continueHistory: true });
    const edited = editor.state.doc;
    editor.commands.finishWordParagraphDecorationEdit();
    expect(editor.state.doc).toBe(edited);
    editor.commands.insertContent("z");
    expect(editor.commands.undo()).toBe(true);
    expect(editor.state.doc.eq(edited)).toBe(true);
    expect(editor.commands.undo()).toBe(true);
    expect(editor.state.doc.eq(before)).toBe(true);
    expect(editor.commands.redo()).toBe(true);
    expect(editor.state.doc.eq(edited)).toBe(true);
    editor.destroy();
  });

  it("does not create an undo entry for a pen edit when no edge is enabled", () => {
    const editor = new QuireEditor({ extensions: [StarterKit, WordParagraph, WordStyles],
      content: { type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text: "No borders" }] }] } });
    const before = editor.state.doc;
    expect(editor.commands.setWordParagraphDecoration({ kind: "border", patch: { spacePoints: 5 } })).toBe(true);
    expect(editor.state.doc).toBe(before);
    expect(editor.commands.undo()).toBe(false);
    editor.destroy();
  });

  it("patches each target's effective edge and undoes the whole range once", () => {
    const editor = editorWithStyles();
    editor.view.dispatch(editor.state.pm.tr.setSelection(TextSelection.create(editor.state.doc, 1, editor.state.doc.content.size - 1)));
    const before = editor.state.doc.toJSON();
    expect(editor.commands.setWordParagraphDecoration({ kind: "border", patch: { color: "#123456" } })).toBe(true);
    expect(editor.state.doc.child(0).attrs.wordParagraph.borders.bottom).toMatchObject({ color: "#123456", spacePoints: 3 });
    expect(editor.state.doc.child(1).attrs.wordParagraph.borders.bottom).toMatchObject({ color: "#123456", spacePoints: 7 });
    expect(editor.state.doc.child(1).attrs.wordParagraph.preservation.litAstAttrs).toEqual({ untouched: true });
    expect(editor.commands.undo()).toBe(true);
    expect(editor.state.doc.toJSON()).toEqual(before);
    expect(editor.commands.redo()).toBe(true);
    editor.destroy();
  });

  it("distinguishes explicit clear from restoring the named style", () => {
    const editor = editorWithStyles();
    expect(editor.commands.setWordParagraphDecoration({ kind: "preset", preset: "none", pen })).toBe(true);
    const registry = editor.state.doc.attrs.wordStyleRegistry;
    const cleared = resolveWordParagraphFormatting(editor.state.doc.child(0).attrs.wordParagraph);
    expect(resolveWordParagraphAppearance(registry, cleared).paragraph.borders?.bottom?.style).toBe("nil");
    expect(editor.commands.setWordParagraphDecoration({ kind: "restore" })).toBe(true);
    const restored = resolveWordParagraphFormatting(editor.state.doc.child(0).attrs.wordParagraph);
    expect(resolveWordParagraphAppearance(registry, restored).paragraph.borders?.bottom?.style).toBe("single");
    expect(editor.commands.undo()).toBe(true);
    expect(editor.state.doc.child(0).attrs.wordParagraph.borders.bottom.style).toBe("nil");
    editor.destroy();
  });

  it("does not mutate during can(), rejects readonly and invalid input", () => {
    const editor = editorWithStyles();
    const before = editor.state.doc;
    expect(editor.can().setWordParagraphDecoration({ kind: "fill", color: "#123456" })).toBe(true);
    expect(editor.state.doc).toBe(before);
    expect(editor.commands.setWordParagraphDecoration({ kind: "border", patch: { spacePoints: 99 } })).toBe(false);
    editor.setEditable(false);
    expect(editor.commands.setWordParagraphDecoration({ kind: "fill", color: "#123456" })).toBe(false);
    expect(editor.state.doc).toBe(before);
    editor.destroy();
  });

  it("leaves a rejected chained transaction untouched", () => {
    const lock = Extension.create({ name: "testParagraphLock", addProseMirrorPlugins() {
      return [new Plugin({ filterTransaction: tr => !tr.docChanged })];
    } });
    const editor = editorWithStyles([lock]);
    const before = editor.state.doc;
    expect(editor.can().setWordParagraphDecoration({ kind: "fill", color: "#123456" })).toBe(false);
    expect(editor.chain().setWordParagraphDecoration({ kind: "fill", color: "#123456" }).run()).toBe(false);
    expect(editor.state.doc).toBe(before);
    editor.destroy();
  });
});
