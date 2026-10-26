// @vitest-environment happy-dom
import { afterEach, describe, expect, it, vi } from "vitest";
import { EditorSelection } from "@quirekit/cm-state";
import { EditorView } from "@quirekit/cm-view";
import { createMsfeEditor, Extension, PasteRule, type MsfeEditor } from "@quirekit/msfe-core";
import { captureMobileClipboard } from "./intent";

const editors: MsfeEditor[] = [];
/** @param filter - Native clipboard transform. @returns A real source owner with one selected word. */
function mount(filter = (text: string) => text): MsfeEditor {
  const parent = document.createElement("div"); document.body.append(parent);
  const editor = createMsfeEditor({ parent, markdown: "old :x: original after", extensions: [Extension.create({
    name: "clipboardAcceptance",
    /** @returns The public clipboard input facet. */
    addCodeMirrorExtensions: () => [EditorView.clipboardInputFilter.of(filter)],
    /** @returns A rule restricted to newly pasted source. */
    addPasteRules: () => [new PasteRule({ find: /:x:/gu, handler: () => "X" })],
  })] });
  editors.push(editor); editor.setSelection(EditorSelection.single(8, 16)); return editor;
}
afterEach(() => { for (const editor of editors.splice(0)) editor.destroy(); document.body.replaceChildren(); vi.restoreAllMocks(); });

describe("versioned mobile paste", () => {
  it("runs native clipboard filters and paste rules in one undoable source replacement", () => {
    const filter = vi.fn((text: string) => text.replace("raw", ":x:")), editor = mount(filter), intent = captureMobileClipboard(editor);
    expect(intent.paste("raw\r\nnew")).toBe("accepted");
    expect(filter).toHaveBeenCalledOnce(); expect(editor.getMarkdown()).toBe("old :x: X\nnew after");
    expect(editor.state.selection.main.empty).toBe(true);
    expect(editor.undo()).toBe(true); expect(editor.getMarkdown()).toBe("old :x: original after");
    expect(editor.history.canUndo).toBe(false); expect(intent.signal.aborted).toBe(true);
  });
  it.each(["empty", "filtered"])("keeps the selection and history for %s text", kind => {
    const editor = mount(() => ""), intent = captureMobileClipboard(editor), selection = editor.state.selection;
    expect(intent.paste(kind === "empty" ? "" : "nonempty")).toBe("empty");
    expect(editor.state.selection).toBe(selection); expect(editor.getMarkdown()).toBe("old :x: original after");
    expect(editor.history.canUndo).toBe(false); intent.release();
  });
  it.each(["edit", "reselect-back", "readonly-back", "mode-back", "replace", "compose", "destroy", "cancel"])("invalidates the original intent after %s", kind => {
    const editor = mount(), intent = captureMobileClipboard(editor);
    if (kind === "edit") editor.run(() => ({ changes: { from: 0, insert: "new " } }));
    else if (kind === "reselect-back") { editor.setSelection(EditorSelection.single(2)); editor.setSelection(EditorSelection.single(8, 16)); }
    else if (kind === "readonly-back") { editor.setReadOnly(true); editor.setReadOnly(false); }
    else if (kind === "mode-back") { editor.setMode("source"); editor.setMode("live"); }
    else if (kind === "replace") editor.replaceDocument("replacement", editor.documentId);
    else if (kind === "compose") editor.element.querySelector(".cm-content")!.dispatchEvent(new CompositionEvent("compositionstart", { bubbles: true }));
    else if (kind === "destroy") editor.destroy();
    else intent.release();
    const source = editor.state.doc.toString();
    expect(intent.paste("WRONG TARGET")).toBe("conflict"); expect(editor.state.doc.toString()).toBe(source);
    intent.release();
  });
  it("releases its only anchor and subscription on cancel, without serializing source on ordinary selection", () => {
    const editor = mount(), capture = vi.spyOn(editor, "captureAnchor"), subscribe = vi.spyOn(editor, "subscribeState"), serialize = vi.spyOn(editor, "getMarkdown");
    const intent = captureMobileClipboard(editor), anchor = capture.mock.results[0]!.value;
    expect(capture).toHaveBeenCalledOnce(); expect(subscribe).toHaveBeenCalledOnce();
    intent.release(); intent.release(); expect(anchor.target()).toBeNull();
    for (let n = 0; n < 50; n++) editor.setSelection(EditorSelection.single(n % 8));
    expect(serialize).not.toHaveBeenCalled(); expect(intent.current()).toBe(false);
  });
});
