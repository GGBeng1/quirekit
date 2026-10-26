// @vitest-environment happy-dom
import { describe, expect, it, vi } from "vitest";
import type { EditorView } from "@quirekit/cm-view";
import type { MsfeEditor } from "../../editor/types";
import { TaskScope } from "../../tasks/scope";
import { ComponentWidget, PARKED_BLOCK_LIMIT } from "./widget";
import type { ComponentView, ComponentViewRenderer } from "./types";

/** @returns A renderer counting mounts and releases, a view stand-in and a document lifetime. */
function setup() {
  const counts = { mounts: 0, destroys: 0 };
  const renderer: ComponentViewRenderer<object> = ({ dom }) => { counts.mounts++; dom.textContent = "diagram"; return { update() {}, destroy() { counts.destroys++; } }; };
  const documentScope = new TaskScope();
  const editor = () => ({ documentScope }) as unknown as MsfeEditor;
  const view = { dom: document.createElement("div"), requestMeasure() {} } as unknown as EditorView;
  /** @param key - Layer identity. @param props - Inputs. @param block - Layout ownership. @returns A fresh widget instance. */
  const widget = (key: string, props: object, block = true) => new ComponentWidget(key, { renderer, props } as ComponentView, block, editor, undefined);
  return { counts, documentScope, view, widget };
}

describe("ComponentWidget off-screen retention", () => {
  it("reattaches a block component scrolled back into view, including after unrelated edits", () => {
    const { counts, view, widget } = setup(), props = {};
    const first = widget("a", props), dom = first.toDOM(view);
    first.destroy(dom);
    expect(first.toDOM(view)).toBe(dom);
    first.destroy(dom);
    // An edit elsewhere rebuilds decorations with new instances but retains props identity.
    expect(widget("a", props).toDOM(view)).toBe(dom);
    expect(counts).toEqual({ mounts: 1, destroys: 0 });
    expect(widget("a", {}).toDOM(view)).not.toBe(dom);
  });

  it("bounds retained mounts, releases them with the document and never retains inline widgets", () => {
    const { counts, documentScope, view, widget } = setup();
    const widgets = Array.from({ length: PARKED_BLOCK_LIMIT + 2 }, (_, index) => widget(`b${index}`, {}));
    for (const item of widgets) item.destroy(item.toDOM(view));
    expect(counts.destroys).toBe(2);
    const inline = widget("inline", {}, false);
    inline.destroy(inline.toDOM(view));
    expect(counts.destroys).toBe(3);
    documentScope.dispose();
    expect(counts.destroys).toBe(PARKED_BLOCK_LIMIT + 3);
    const before = counts.mounts;
    widgets.at(-1)!.toDOM(view);
    expect(counts.mounts).toBe(before + 1);
  });
});

describe("component block edge coordinates", () => {
  it("limits replacement endpoints to a scaled text line while retaining the full object box", () => {
    const { view, documentScope } = setup();
    Object.assign(view, { defaultLineHeight: 20, scaleY: 1.5 });
    const renderer: ComponentViewRenderer<object> = () => ({ update() {}, destroy() {} });
    const widget = new ComponentWidget("header", { renderer, props: {} }, true, () => ({ documentScope }) as unknown as MsfeEditor, undefined, true);
    const dom = widget.toDOM(view);
    vi.spyOn(dom, "getBoundingClientRect").mockReturnValue(new DOMRect(30, 60, 400, 300));
    expect(widget.coordsAt(dom, 0, 1)).toEqual({ left: 30, right: 30, top: 60, bottom: 90 });
    expect(widget.coordsAt(dom, 50, -1)).toEqual({ left: 430, right: 430, top: 330, bottom: 360 });
    expect(dom.getBoundingClientRect().height).toBe(300);
    documentScope.dispose();
  });
  it("associates point widgets by side, caps short blocks and leaves inline geometry native", () => {
    const { view, widget, documentScope } = setup();
    Object.assign(view, { defaultLineHeight: 20, scaleY: 1 });
    const point = widget("point", {}), dom = point.toDOM(view);
    vi.spyOn(dom, "getBoundingClientRect").mockReturnValue(new DOMRect(30, 60, 400, 12));
    expect(point.coordsAt(dom, 0, -1)).toEqual({ left: 30, right: 30, top: 60, bottom: 72 });
    expect(point.coordsAt(dom, 0, 1)).toEqual({ left: 430, right: 430, top: 60, bottom: 72 });
    const inline = widget("inline", {}, false);
    expect(inline.coordsAt(inline.toDOM(view), 0, 1)).toBeNull();
    documentScope.dispose();
  });
});
