// @vitest-environment happy-dom
import { afterEach, describe, expect, it, vi } from "vitest";
import { EditorSelection } from "@quirekit/cm-state";
import { createMsfeEditor } from "../editor/create";
import type { MsfeEditor } from "../editor/types";
import type { MsfeExtension } from "./types";

const editors: MsfeEditor[] = [];
afterEach(() => { for (const editor of editors.splice(0)) editor.destroy(); document.body.replaceChildren(); });

/** @param extensions - Lifecycle participants in dependency order. @returns Mounted owner and its error observer. */
function mount(extensions: readonly MsfeExtension[]) {
  const parent = document.body.appendChild(document.createElement("div")), onError = vi.fn();
  const editor = createMsfeEditor({ parent, markdown: "Original", extensions, onError });
  editors.push(editor);
  return { editor, parent, onError };
}

describe("extension lifetime cancellation", () => {
  it.each(["onBeforeCreate", "onCreate"] as const)("ends remaining creation hooks when %s closes the editor", hook => {
    const started = vi.fn(), finalized = vi.fn(), released = vi.fn();
    const { editor, parent, onError } = mount([
      { id: "closer", [hook]: ({ editor }: { editor: MsfeEditor }) => { editor.destroy(); return released; } },
      { id: "consumer", requires: ["closer"],
        onBeforeCreate: context => { if (hook === "onBeforeCreate") { started(); context.editor.captureAnchor({ from: 0, to: 1 }); } },
        onCreate: context => { started(); context.editor.captureAnchor({ from: 0, to: 1 }); },
        onDestroy: finalized },
    ]);
    expect(editor.scope.disposed).toBe(true);
    expect(parent.querySelector(".cm-editor")).toBeNull();
    expect(started).not.toHaveBeenCalled();
    expect(onError).not.toHaveBeenCalled();
    expect(finalized).toHaveBeenCalledTimes(1);
    if (hook === "onCreate") expect(released).toHaveBeenCalledTimes(1);
    editor.destroy();
    expect(finalized).toHaveBeenCalledTimes(1);
  });

  it("releases a late create result after teardown, without retaining its resource", () => {
    const events: string[] = [];
    const { editor, onError } = mount([
      { id: "resource", onCreate: () => () => { events.push("release-resource"); }, onDestroy: () => { events.push("destroy-resource"); } },
      { id: "closer", requires: ["resource"], onCreate: ({ editor }) => {
        editor.destroy(); return () => { events.push("release-late"); };
      }, onDestroy: () => { events.push("destroy-closer"); } },
    ]);
    editor.destroy();
    expect(events).toEqual(["release-resource", "destroy-closer", "destroy-resource", "release-late"]);
    expect(onError).not.toHaveBeenCalled();
  });

  it("does not publish selection hooks after a transaction hook tears down the editor", () => {
    const selected = vi.fn(), later = vi.fn(), changed = vi.fn();
    const { editor, onError } = mount([
      { id: "closer", onTransaction: ({ editor }) => { editor.destroy(); },
        onSelectionUpdate: ({ editor }) => { selected(); editor.captureAnchor({ from: 0, to: 1 }); } },
      { id: "consumer", requires: ["closer"], onTransaction: later, onChange: changed },
    ]);
    editor.run(() => ({ changes: { from: 0, insert: "X" }, selection: EditorSelection.single(1) }));
    expect(editor.getMarkdown()).toBe("XOriginal");
    expect(selected).not.toHaveBeenCalled();
    expect(later).not.toHaveBeenCalled();
    expect(changed).not.toHaveBeenCalled();
    expect(onError).not.toHaveBeenCalled();
  });
});
