// @vitest-environment happy-dom
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import type { Editor, QuireMountedTableChromeModel } from "@quirekit/core";
import { createBlockEditor, type BlockEditorInstance } from "@quirekit/block-editor";
import { createBlockTableExtensions } from "../extension";
import { captureTableTarget } from "../ui/actions";
import { createTableHover } from "./hover";

let instance: BlockEditorInstance;
beforeEach(() => {
  instance = createBlockEditor({ extensions: createBlockTableExtensions() });
  instance.editor.commands.insertBlockTable({ rowCount: 2, columnCount: 2 });
});
afterEach(() => { instance.destroy(); document.body.replaceChildren(); vi.restoreAllMocks(); });

/** @returns A real canonical table with a deterministic DOM and public hit-test boundary. */
function setup() {
  const editor = instance.editor, original = captureTableTarget(editor)!;
  const cellPos = original.tablePos + original.map.cellAt(0, 0)!.originCellPos + 2;
  const hit = vi.fn(() => ({ pos: cellPos, inside: original.tablePos }));
  const host = document.createElement("div");
  host.innerHTML = '<table><tbody><tr><td>cell</td></tr></tbody></table><p>outside</p><div class="qk-editor-table__chrome"><button>rail</button></div>';
  document.body.append(host);
  const cell = host.querySelector("td")!, outside = host.querySelector("p")!, rail = host.querySelector("button")!;
  const physicalHit = vi.spyOn(document, "elementFromPoint").mockReturnValue(cell);
  const changed = vi.fn();
  // The adapter supplies only the public view contract consumed by hover;
  // canonical document identities and table maps remain real editor state.
  const adapter = {
    get state() { return editor.state; }, get isEditable() { return editor.isEditable; }, view: { posAtCoords: hit }
  } as unknown as Editor;
  const rect = { left: 100, top: 100, right: 500, bottom: 200 };
  const anchor = { id: "table", tablePos: original.tablePos, rect, semanticCellIds: [] };
  const model: QuireMountedTableChromeModel = {
    tableId: "table", tablePos: original.tablePos, activeFragmentId: "fragment", selection: null, resizeSession: null,
    fragments: [{ fragmentId: "fragment", tableRect: rect, guides: [], rows: [], columns: [], insertions: [], resizes: [],
      corner: { ...anchor, kind: "table-corner" }, menu: { ...anchor, kind: "menu" } }]
  };
  const hover = createTableHover(adapter, () => host, () => model, changed);
  host.addEventListener("pointermove", hover.move);
  /** @param element - Actual event target. @param x - Client x. @param y - Client y. @param buttons - Pressed buttons. */
  function move(element: Element, x = 150, y = 120, buttons = 0): void {
    element.dispatchEvent(new PointerEvent("pointermove", { bubbles: true, clientX: x, clientY: y, buttons }));
  }
  return { editor, hover, host, cell, outside, rail, hit, physicalHit, changed, move };
}

it("releases hover on outside movement without a transaction or repeated cell hit tests", () => {
  const state = setup(), before = state.editor.state.pm;
  expect(state.hover.release(new PointerEvent("pointerup"))).toBe(false);
  state.move(state.cell);
  expect(state.hover.current).not.toBeNull();
  for (let x = 150; x < 350; x++) state.move(state.cell, x);
  expect(state.hit).toHaveBeenCalledTimes(1);
  expect(state.changed).toHaveBeenCalledTimes(1);
  state.move(state.outside, 150, 250);
  expect(state.hover.current).toBeNull();
  expect(state.changed).toHaveBeenCalledTimes(2);
  expect(state.editor.state.pm).toBe(before);
});

it("keeps the shared control crossing and clears when leaving that region or viewport", () => {
  const state = setup();
  state.move(state.cell);
  for (const y of [99, 98, 95, 91]) state.move(state.host, 150, y);
  state.move(state.rail, 150, 90);
  expect(state.hover.current).not.toBeNull();
  expect(state.hit).toHaveBeenCalledTimes(1);
  state.move(state.host, 150, 40);
  expect(state.hover.current).toBeNull();
  state.move(state.cell);
  state.hover.leave(new PointerEvent("pointerleave"));
  expect(state.hover.current).toBeNull();
});

it("retains a drag owner outside the viewport and re-hits the physical target after release", () => {
  const state = setup();
  state.move(state.cell);
  state.move(state.rail, 550, 40, 1);
  state.hover.leave(new PointerEvent("pointerleave", { buttons: 1 }));
  state.physicalHit.mockReturnValue(state.outside);
  state.hover.refresh();
  expect(state.physicalHit).not.toHaveBeenCalled();
  expect(state.hover.current).not.toBeNull();
  state.hover.release(new PointerEvent("pointerup", { clientX: 550, clientY: 40 }));
  state.hover.refresh();
  expect(state.hover.current).toBeNull();
});

it("clears stationary hover after scrolling content away", () => {
  const state = setup();
  state.move(state.cell);
  state.physicalHit.mockReturnValue(null);
  state.hover.refresh();
  expect(state.hover.current).toBeNull();
  expect(state.hit).toHaveBeenCalledTimes(1);
});

it("rejects stale document targets and all hover in read-only mode", () => {
  const state = setup();
  state.move(state.cell);
  const old = state.hover.current;
  state.editor.commands.insertContent("edit");
  expect(state.hover.current).toBeNull();
  state.hover.refresh();
  expect(state.hover.current?.doc).toBe(state.editor.state.doc);
  expect(state.hover.current).not.toBe(old);
  expect(state.hit).toHaveBeenCalledTimes(2);
  state.editor.setEditable(false);
  expect(state.hover.current).toBeNull();
  state.hover.refresh();
  state.move(state.cell);
  expect(state.hit).toHaveBeenCalledTimes(2);
});
