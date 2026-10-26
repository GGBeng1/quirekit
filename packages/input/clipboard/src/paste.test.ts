import { createEditor, Extension } from "@quirekit/core";
import { Plugin, Slice, TextSelection, type Transaction } from "@quirekit/pm";
import { StarterKit } from "@quirekit/starter-kit";
import { describe, expect, it, vi } from "vitest";
import { canvasInternalClipboardMime, pasteQuireClipboardSlice, serializeQuireClipboardSlice } from "./index";

const content = { type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text: "keep" }] }] };

/** Selection owner that refuses replacement without altering the document. */
class RejectPasteSelection extends TextSelection {
  /** @param tr - Uncommitted input transaction. @param _slice - Unsupported source. */
  override replace(tr: Transaction, _slice = Slice.empty): void {
    tr.setMeta("preventDispatch", true);
  }
}

describe("atomic clipboard rejection", () => {
  it("reports a filtered transaction without publishing success", () => {
    const result = vi.fn();
    const blocker = Extension.create({ name: "blocker", addProseMirrorPlugins: () => [new Plugin({ filterTransaction: tr => !tr.docChanged })] });
    const editor = createEditor({ extensions: [StarterKit, blocker], content, onClipboardPasteResult: result });
    const before = editor.state.pm;
    pasteQuireClipboardSlice(editor, editor.state.doc.slice(1, 5), { type: "paste" } as ClipboardEvent);
    expect(editor.state.pm).toBe(before);
    expect(result).toHaveBeenCalledOnce();
    expect(result).toHaveBeenCalledWith(expect.objectContaining({ status: "rejected", reason: "filtered" }));
    editor.destroy();
  });

  it("prepares one domain transaction before resource application and emits its result", () => {
    const order: string[] = [];
    const editor = createEditor({ extensions: [StarterKit], content, editorProps: {
      quireClipboardResources: () => [{ namespace: "test", version: 1, key: "one", data: {} }],
      quireClipboardResourcePaste: ({ slice }) => ({ slice, apply: tr => { order.push("resource"); expect(tr.getMeta("domain")).toBe(true); } }),
      quireClipboardPaste: (tr, slice) => { order.push("domain"); tr.replaceSelection(slice).setMeta("domain", true); return true; }
    } });
    const slice = editor.state.doc.slice(1, 5);
    const payload = serializeQuireClipboardSlice({ editor, slice });
    const result = vi.fn();
    editor.on("clipboardPasteResult", result);
    const event = { type: "paste", clipboardData: { getData: (mime: string) => mime === canvasInternalClipboardMime ? payload.internal : "" } } as ClipboardEvent;
    const dispatch = vi.spyOn(editor, "dispatchTransaction");
    pasteQuireClipboardSlice(editor, slice, event);
    expect(order).toEqual(["domain", "resource"]);
    expect(dispatch).toHaveBeenCalledOnce();
    expect(result).toHaveBeenCalledWith(expect.objectContaining({ status: "applied", reason: null }));
    editor.destroy();
  });
  it.each([false, true])("does not dispatch rejected paste or apply resource metadata (resources=%s)", resources => {
    const apply = vi.fn();
    const editor = createEditor({ extensions: [StarterKit], content, editorProps: {
      quireClipboardResources: () => [{ namespace: "test", version: 1, key: "one", data: {} }],
      quireClipboardResourcePaste: ({ slice }) => ({ slice, apply })
    } });
    const slice = editor.state.doc.slice(1, 5);
    const payload = serializeQuireClipboardSlice({ editor, slice });
    const before = editor.state.doc;
    editor.dispatchTransaction(editor.state.pm.tr.setSelection(new RejectPasteSelection(before.resolve(1), before.resolve(5))));
    const dispatch = vi.spyOn(editor, "dispatchTransaction");
    const result = vi.fn();
    editor.on("clipboardPasteResult", result);
    const event = { type: "paste", clipboardData: { getData: (mime: string) => resources && mime === canvasInternalClipboardMime ? payload.internal : "" } } as ClipboardEvent;
    expect(pasteQuireClipboardSlice(editor, slice, event)).toBe(true);
    expect(editor.state.doc).toBe(before);
    expect(dispatch).not.toHaveBeenCalled();
    expect(apply).not.toHaveBeenCalled();
    expect(result).toHaveBeenCalledWith(expect.objectContaining({ status: "rejected", reason: "prevent-dispatch" }));
    editor.destroy();
  });

  it("rejects readonly input before resource preparation or custom paste handlers", () => {
    const handler = vi.fn();
    const editor = createEditor({ extensions: [StarterKit], content, editable: false,
      editorProps: { handlePaste: handler } });
    const dispatch = vi.spyOn(editor, "dispatchTransaction");
    expect(pasteQuireClipboardSlice(editor, editor.state.doc.slice(1, 5), { type: "paste" } as ClipboardEvent)).toBe(false);
    expect(dispatch).not.toHaveBeenCalled();
    expect(handler).not.toHaveBeenCalled();
    editor.destroy();
  });
});
