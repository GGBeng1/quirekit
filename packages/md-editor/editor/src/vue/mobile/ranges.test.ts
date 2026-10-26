// @vitest-environment happy-dom
import { afterEach, describe, expect, it, vi } from "vitest";
import { EditorState } from "@quirekit/cm-state";
import { EditorView } from "@quirekit/cm-view";
import { markdown } from "@quirekit/cm-lang-markdown";
import type { MsfeEditor, MsfeTarget } from "@quirekit/msfe-core";
import { mobileSelectionActions, selectMobileRange } from "./ranges";
afterEach(() => vi.restoreAllMocks());

/** @param source - Complete admitted Markdown fixture. @param head - Retained caret. @returns Native selection updates with forbidden document work spies. */
function fixture(source: string, head: number) {
  let state = EditorState.create({ doc: source, selection: { anchor: head }, extensions: [markdown()] });
  const view = { composing: false }, write = vi.fn(), serialize = vi.fn();
  vi.spyOn(EditorView, "findFromDOM").mockReturnValue(view as unknown as EditorView);
  const editor = { instanceId: "this", documentId: "doc", revision: 2, mode: "live", element: document.createElement("div"),
    get state() { return state; }, getMarkdown: serialize, run: write,
    /** @returns Current versioned source identity. */
    captureTarget(): MsfeTarget { return { instanceId: "this", documentId: "doc", revision: 2, selection: state.selection }; },
    /** @param selection - Accepted native selection without source changes. */
    setSelection(selection: MsfeTarget["selection"]): void { state = state.update({ selection }).state; },
  } as unknown as MsfeEditor;
  const target: MsfeTarget = { instanceId: "this", documentId: "doc", revision: 2, selection: state.selection };
  return { editor, target, view, write, serialize };
}
describe("mobile range shortcuts", () => {
  it("selects the complete current block then all source without writing or serializing", () => {
    const source = "# Title\n\ncurrent **paragraph**\nsecond line\n\ntail", f = fixture(source, 13);
    expect(selectMobileRange(f.editor, f.target, "select-block")).toBe(true);
    expect(f.editor.state.sliceDoc(f.editor.state.selection.main.from, f.editor.state.selection.main.to)).toBe("current **paragraph**\nsecond line");
    expect(selectMobileRange(f.editor, f.target, "select-all")).toBe(true);
    expect(f.editor.state.selection.main).toMatchObject({ from: 0, to: source.length });
    expect(f.editor.revision).toBe(2); expect(f.write).not.toHaveBeenCalled(); expect(f.serialize).not.toHaveBeenCalled();
  });
  it.each(["text\n\nnext", "```ts\nunfinished"])("does not expand an empty line or incomplete fence into the document: %s", source => {
    const f = fixture(source, source.startsWith("text") ? 5 : 8);
    const actions = mobileSelectionActions(f.editor, f.target, "zh-CN");
    expect(actions[0]?.disabled).toBe(false); expect(actions[1]?.disabled).toBe(true);
    expect(selectMobileRange(f.editor, f.target, "select-block")).toBe(false);
  });
  it("rejects stale/cross-owner targets and composition without moving the caret", () => {
    const f = fixture("paragraph", 3), original = f.editor.state.selection;
    for (const replacement of [{ instanceId: "other" }, { documentId: "replacement" }, { revision: 1 }]) {
      expect(selectMobileRange(f.editor, { ...f.target, ...replacement }, "select-all")).toBe(false);
    }
    f.view.composing = true; expect(selectMobileRange(f.editor, f.target, "select-all")).toBe(false);
    expect(f.editor.state.selection).toBe(original);
  });
});
