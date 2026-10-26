// @vitest-environment happy-dom
import { expect, it, vi } from "vitest";
import { createApp, h } from "vue";
import type { Editor } from "@quirekit/core";
import { createBlockEditor } from "../../runtime/create";
import { readNotes } from "../../notes/query";
import { useNoteContext } from "./context";

it("measures one of 100 notes, reuses caret-only geometry and releases subscriptions and queued work", () => {
  vi.useFakeTimers();
  const instance = createBlockEditor({ content: { type: "doc", content: [
    { type: "paragraph", content: [{ type: "text", text: "普通正文" }] },
    ...Array.from({ length: 100 }, (_, index) => ({ type: "footnoteDefinition", attrs: { noteId: `note-${index}` },
      content: [{ type: "paragraph", content: [{ type: "text", text: "脚注说明文字" }] }] }))
  ] } });
  const editor = instance.editor, host = document.createElement("div"); document.body.append(host);
  const notes = readNotes(editor.state.doc);
  const geometry = vi.fn(() => new DOMRect(100, 100, 800, 40));
  const noteDOM = document.createElement("section"); noteDOM.getBoundingClientRect = geometry; document.body.append(noteDOM);
  const nodeDOM = vi.fn<(position: number) => HTMLElement | null>(() => noteDOM);
  let committed = (): void => {};
  const projection = { get state() { return editor.state; }, get isEditable() { return editor.isEditable; }, get isDestroyed() { return editor.isDestroyed; },
    mountedView: { nodeDOM,
      /** @param listener - Runs after the simulated View projection. @returns Cleanup for this subscription. */
      onGeometryUpdate(listener: () => void) { committed = listener; return () => { committed = () => {}; }; }
    }, on: editor.on.bind(editor), off: editor.off.bind(editor) } as unknown as Editor;
  let context!: ReturnType<typeof useNoteContext>;
  const app = createApp({ setup() { context = useNoteContext(projection); return () => h("span"); } });
  app.mount(host);
  let mounted = true;
  try {
    committed(); expect(nodeDOM).not.toHaveBeenCalled();
    editor.commands.navigateBlockFootnote("note-99", "definition"); vi.advanceTimersToNextFrame();
    expect(nodeDOM).not.toHaveBeenCalled(); committed();
    expect(nodeDOM).toHaveBeenCalledExactlyOnceWith(notes[99]!.definitions[0]!.from);
    expect(geometry).toHaveBeenCalledOnce();
    const anchor = context.anchor.value;
    for (let index = 0; index < 10; index++) editor.commands.setTextSelection(notes[99]!.definitions[0]!.from + 2 + index % 4);
    committed(); expect(geometry).toHaveBeenCalledOnce(); expect(context.anchor.value).toBe(anchor);
    editor.commands.navigateBlockFootnote("note-0", "definition"); committed();
    expect(geometry).toHaveBeenCalledTimes(2);
    // A resize during source restoration can temporarily lose nodeDOM. The next
    // committed frame must recover even if the selection has not changed.
    nodeDOM.mockReturnValueOnce(null); context.measure(); expect(context.anchor.value).toBeNull();
    committed(); expect(context.anchor.value).not.toBeNull(); expect(geometry).toHaveBeenCalledTimes(3);
    editor.setEditable(false); expect(context.target.value).toBeNull(); expect(context.anchor.value).toBeNull();
    editor.setEditable(true); editor.commands.setTextSelection(1); committed();
    expect(geometry).toHaveBeenCalledTimes(3); expect(context.target.value).toBeNull();
    editor.commands.navigateBlockFootnote("note-0", "definition"); app.unmount(); mounted = false; committed();
    expect(geometry).toHaveBeenCalledTimes(3);
    editor.commands.navigateBlockFootnote("note-99", "definition"); committed();
    expect(context.target.value!.node.attrs.noteId).toBe("note-0"); expect(geometry).toHaveBeenCalledTimes(3);
  } finally { if (mounted) app.unmount(); instance.destroy(); host.remove(); noteDOM.remove(); vi.useRealTimers(); }
});
