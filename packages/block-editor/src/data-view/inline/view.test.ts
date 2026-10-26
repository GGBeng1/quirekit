// @vitest-environment happy-dom
import { afterEach, expect, it, vi } from "vitest";
import type { QuireNodeViewRendererProps } from "@quirekit/core";
import { DecorationSet } from "@quirekit/pm";
import { createDataView, readDataView, serializeDataView } from "@quirekit/data-view";
import { createBlockEditor, type BlockEditorInstance } from "../../runtime";
import { createBlockDataViewSurface } from "./view";

const owners: BlockEditorInstance[] = [];
/** @returns A canonical atom and a live mapped position, without mounting the full renderer. */
function fixture() {
  const value = createDataView("inline-test");
  const owner = createBlockEditor({ content: { type: "doc", content: [{ type: "dataView", attrs: { dataView: value } }, { type: "paragraph" }] } });
  owners.push(owner);
  const editor = owner.editor, changed = vi.fn();
  let position = 0;
  const props = { editor, node: editor.state.pm.doc.nodeAt(0)!, view: { dom: document.createElement("div") }, getPos: () => position, decorations: [], innerDecorations: DecorationSet.empty, extension: editor.extensions.find(item => item.name === "dataView")!, HTMLAttributes: {} } as unknown as QuireNodeViewRendererProps;
  const surface = createBlockDataViewSurface(props, changed, vi.fn());
  return { editor, surface, changed, value, move: (next: number) => { position = next; } };
}
afterEach(() => owners.splice(0).forEach(owner => owner.destroy()));

it("commits at the current mapped position with one undo event and rejects stale source", async () => {
  const { editor, surface, value, move } = fixture();
  editor.commands.insertContentAt(0, { type: "paragraph", content: [{ type: "text", text: "Before" }] }); move(8);
  const before = editor.getJSON(), next = readDataView({ ...value, defaultViewId: value.views[1]!.id });
  const save = { base: serializeDataView(value), value: next };
  const mappings: boolean[] = [];
  editor.on("transaction", ({ transaction }) => { if (transaction.docChanged) mappings.push(transaction.mapping.mapResult(8, 1).deleted); });
  expect(await surface.snapshot().commit(save)).toEqual({ accepted: true });
  expect(mappings).toEqual([false]);
  expect(editor.state.pm.doc.nodeAt(8)!.attrs.dataView).toEqual(next);
  expect((await surface.snapshot().commit(save)).accepted).toBe(false);
  expect(surface.snapshot().undo?.()).toBe(true); expect(editor.getJSON()).toEqual(before);
  expect(surface.snapshot().redo?.()).toBe(true); expect(editor.state.pm.doc.nodeAt(8)!.attrs.dataView).toEqual(next);
  surface.destroy();
});

it("keeps the source and component stable during selection and position-only updates", () => {
  const { editor, surface, changed, move } = fixture();
  const snapshot = surface.snapshot(), node = editor.state.pm.doc.nodeAt(0)!;
  for (let index = 0; index < 100; index++) { move(index); surface.update(node); }
  expect(changed).not.toHaveBeenCalled(); expect(surface.snapshot()).toBe(snapshot);
  editor.setEditable(false); surface.syncEditable();
  expect(surface.snapshot().readOnly).toBe(true); expect(surface.snapshot().value).toBe(snapshot.value);
  expect(changed).toHaveBeenCalledOnce(); surface.destroy();
});

it("rejects readonly and destroyed callbacks even when deletion is undone", async () => {
  const { editor, surface, value } = fixture();
  const actions = surface.snapshot(), save = { base: serializeDataView(value), value: readDataView({ ...value, defaultViewId: value.views[1]!.id }) };
  editor.setEditable(false); expect((await actions.commit(save)).accepted).toBe(false);
  editor.setEditable(true); editor.commands.deleteRange({ from: 0, to: 1 }); surface.destroy(); editor.commands.undo();
  expect((await actions.commit(save)).accepted).toBe(false); expect(actions.undo?.()).toBe(false);
});

it("retains inner input and card drag ownership while allowing outer object selection", () => {
  const { surface } = fixture();
  const input = document.createElement("input"); surface.dom.append(input);
  for (const type of ["keydown", "beforeinput", "compositionstart", "pointerdown", "dragstart", "drop", "paste"]) {
    const event = new Event(type, { bubbles: true }); input.dispatchEvent(event);
    expect(surface.stopEvent(event)).toBe(true);
  }
  const outer = new Event("pointerdown"); surface.dom.dispatchEvent(outer); expect(surface.stopEvent(outer)).toBe(false);
  expect(surface.ignoreMutation()).toBe(true); surface.destroy();
});

it("releases only the outer object selection when a native field gains focus", () => {
  const { editor, surface } = fixture();
  const input = document.createElement("input"); surface.dom.append(input); document.body.append(surface.dom);
  editor.commands.setNodeSelection(0);
  const before = editor.state.pm.doc;
  input.focus();
  expect(document.activeElement).toBe(input);
  expect(editor.state.pm.selection.$from.parent.inlineContent).toBe(true);
  expect(editor.state.pm.doc).toBe(before); expect(editor.can().undo()).toBe(false);
  surface.destroy(); surface.dom.remove();
});
