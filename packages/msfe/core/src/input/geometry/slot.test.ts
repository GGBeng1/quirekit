// @vitest-environment happy-dom
import { afterEach, expect, it, vi } from "vitest";
import type { EditorView } from "@quirekit/cm-view";
import { sourceSlotCaret } from "./slot";

afterEach(() => { vi.restoreAllMocks(); document.body.replaceChildren(); });

/** @returns A declared empty source slot with independently measured text and chrome. */
function fixture() {
  const row = document.createElement("div"), slot = document.createElement("span");
  slot.setAttribute("data-msfe-caret-slot", ""); slot.textContent = "\u200b"; row.append(slot); document.body.append(row);
  const native = document.createRange(); vi.spyOn(document, "createRange").mockReturnValue(native);
  const measure = vi.spyOn(native, "getBoundingClientRect").mockReturnValue(new DOMRect(30, 12, 0, 18));
  const view = { posAtDOM: vi.fn(() => 7) } as unknown as EditorView;
  return { row, slot, native, measure, view };
}

it("measures only the explicit zero-length slot's text, for either adjacent association", () => {
  const f = fixture();
  for (const [offset, side] of [[0, 1], [1, -1]] as const) {
    expect(sourceSlotCaret(f.view, 7, { node: f.row, offset }, side)).toEqual({ left: 30, right: 30, top: 12, bottom: 30 });
    expect(f.native.startContainer).toBe(f.slot.firstChild); expect(f.native.endContainer).toBe(f.slot.firstChild);
  }
  expect(f.measure).toHaveBeenCalledTimes(2);
});

it("does not reinterpret a replacement buffer, another source position or actual widget content as an empty slot", () => {
  const f = fixture(), dom = { node: f.row, offset: 0 };
  expect(sourceSlotCaret(f.view, 8, dom, 1)).toBeNull();
  f.slot.removeAttribute("data-msfe-caret-slot"); expect(sourceSlotCaret(f.view, 7, dom, 1)).toBeNull();
  f.slot.setAttribute("data-msfe-caret-slot", ""); f.slot.textContent = "widget text";
  expect(sourceSlotCaret(f.view, 7, dom, 1)).toBeNull(); expect(f.measure).not.toHaveBeenCalled();
});
