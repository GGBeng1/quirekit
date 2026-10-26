// @vitest-environment happy-dom
import { afterEach, describe, expect, it, vi } from "vitest";
import { EditorSelection } from "@quirekit/cm-state";
import { createMsfeEditor, type MsfeEditor } from "@quirekit/msfe-core";
import { captureMobileClipboard } from "./intent";
import type { MobileClipboardResult } from "./types";
const editors: MsfeEditor[] = [];
/** @param editor - Canonical source. @param cut - Requested deletion. @param publish - Platform write. @returns The released intent's outcome. */
async function copyMobileSelection(editor: MsfeEditor, cut: boolean, publish: (source: string) => Promise<void>): Promise<MobileClipboardResult> {
  const intent = captureMobileClipboard(editor);
  try { return await intent.copy(cut, publish); } finally { intent.release(); }
}
/** @returns A real canonical source owner with a directed selection. */
function mount(): MsfeEditor {
  const parent = document.createElement("div"); document.body.append(parent);
  const editor = createMsfeEditor({ parent, markdown: "original text" }); editors.push(editor);
  editor.setSelection(EditorSelection.single(0, 8)); return editor;
}
afterEach(() => { editors.splice(0).forEach(editor => editor.destroy()); document.body.replaceChildren(); });
describe("mobile selection publication", () => {
  it("copies unchanged source and cuts once only after clipboard acceptance", async () => {
    const editor = mount(), publish = vi.fn(async () => {});
    expect(await copyMobileSelection(editor, false, publish)).toBe("accepted");
    expect(publish).toHaveBeenCalledWith("original"); expect(editor.getMarkdown()).toBe("original text");
    expect(await copyMobileSelection(editor, true, publish)).toBe("accepted");
    expect(editor.getMarkdown()).toBe(" text"); editor.undo(); expect(editor.getMarkdown()).toBe("original text");
  });
  it("preserves source when the platform refuses publication", async () => {
    const editor = mount();
    expect(await copyMobileSelection(editor, true, async () => { throw new Error("denied"); })).toBe("failed");
    expect(editor.getMarkdown()).toBe("original text");
  });
  it.each(["edit", "reselect", "readonly", "replace"])("rejects delayed deletion after %s", async kind => {
    const editor = mount(); let finish!: () => void;
    const pending = copyMobileSelection(editor, true, () => new Promise<void>(resolve => { finish = resolve; }));
    if (kind === "edit") editor.run(() => ({ changes: { from: 12, insert: "X" } }));
    else if (kind === "reselect") editor.setSelection(EditorSelection.single(9, 13));
    else if (kind === "readonly") editor.setReadOnly(true);
    else editor.replaceDocument("replacement", "new-document");
    const source = editor.getMarkdown(); finish();
    expect(await pending).toBe("conflict"); expect(editor.getMarkdown()).toBe(source);
  });
});
