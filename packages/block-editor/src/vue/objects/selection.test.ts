// @vitest-environment happy-dom
import { expect, it, vi } from "vitest";
import type { Editor } from "@quirekit/core";
import { createBlockEditor } from "../../runtime/create";
import { observeBlockObjectSelection, trackBlockObjectSelection } from "./selection";

it("projects only the old and new card after View commit and cleans permission and teardown state", async () => {
  const instance = createBlockEditor({ content: { type: "doc", content: [
    { type: "paragraph", content: [{ type: "text", text: "正文" }] },
    ...Array.from({ length: 100 }, () => ({ type: "webCard", attrs: { url: "https://example.com", title: "资料" } }))
  ] } });
  const editor = instance.editor, host = document.createElement("div"); document.body.append(host);
  editor.commands.setTextSelection(1);
  const start = editor.state.doc.firstChild!.nodeSize;
  const cards = Array.from({ length: 100 }, () => { const root = document.createElement("section"); root.className = "qk-block-rich"; host.append(root); return root; });
  const changes = cards.map(() => vi.fn()), releases = cards.map((card, index) => observeBlockObjectSelection(card, changes[index]!));
  changes.forEach(changed => changed.mockClear());
  const nodeDOM = vi.fn((pos: number) => cards[pos - start] ?? null), view = { dom: host, nodeDOM };
  let committed = (): void => {};
  const mountedView = {
    /** @param listener - Projection to run after the simulated View commit. @returns Subscription cleanup. */
    onGeometryUpdate(listener: () => void) { committed = listener; return () => { committed = () => {}; }; }
  };
  const projection = { get state() { return editor.state; }, get isEditable() { return editor.isEditable; }, view, mountedView, on: editor.on.bind(editor), off: editor.off.bind(editor) } as unknown as Editor;
  const stop = trackBlockObjectSelection(projection);
  try {
    expect(nodeDOM).not.toHaveBeenCalled();
    editor.commands.setNodeSelection(start); await Promise.resolve();
    expect(nodeDOM).not.toHaveBeenCalled(); committed();
    expect(cards[0]!.dataset.selected).toBe("true"); expect(nodeDOM).toHaveBeenCalledOnce();
    editor.commands.setNodeSelection(start + 99); committed();
    expect(cards[0]!.dataset.selected).toBeUndefined(); expect(cards[99]!.dataset.selected).toBe("true");
    expect(nodeDOM).toHaveBeenCalledTimes(2);
    expect(changes[0]!.mock.calls).toEqual([[true], [false]]); expect(changes[99]!.mock.calls).toEqual([[true]]);
    expect(changes.slice(1, 99).every(changed => changed.mock.calls.length === 0)).toBe(true);
    committed(); expect(nodeDOM).toHaveBeenCalledTimes(2);
    expect(host.style.getPropertyValue("--qk-block-selection-fill")).toBe("transparent");
    editor.setEditable(false); committed();
    expect(cards[99]!.dataset.selected).toBeUndefined(); expect(host.style.getPropertyValue("--qk-block-selection-fill")).toBe("");
    editor.setEditable(true); committed(); expect(cards[99]!.dataset.selected).toBe("true");
    // Restoring a document can replace the mount after Core emits the selection
    // event. Presentation must resolve the restored shell, not retain the old one.
    editor.commands.setNodeSelection(start);
    await Promise.resolve(); expect(cards[0]!.dataset.selected).toBeUndefined();
    const old = cards[0]!, restored = document.createElement("section"); restored.className = "qk-block-rich";
    old.replaceWith(restored); cards[0] = restored;
    committed();
    expect(restored.dataset.selected).toBe("true"); expect(old.dataset.selected).toBeUndefined();
    expect(cards[99]!.dataset.selected).toBeUndefined();
    stop(); expect(restored.dataset.selected).toBeUndefined();
    nodeDOM.mockClear(); editor.commands.setNodeSelection(start); committed(); expect(nodeDOM).not.toHaveBeenCalled();
  } finally { stop(); releases.forEach(release => release()); instance.destroy(); host.remove(); }
});
