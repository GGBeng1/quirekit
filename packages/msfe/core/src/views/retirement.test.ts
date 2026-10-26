// @vitest-environment happy-dom
import { describe, expect, it } from "vitest";
import { Compartment, EditorState } from "@quirekit/cm-state";
import { Decoration, EditorView, WidgetType } from "@quirekit/cm-view";

/** Pinned CodeMirror ownership seam; never exposed by the product API. */
interface NativeTile {
  /** Native parent, retained only while this tile remains active. */
  readonly parent: NativeTile | null;
}

/** @param node - A known native view DOM node. @returns Its current pinned dependency owner. */
function tileOf(node: Node): NativeTile { return Reflect.get(node, "cmTile") as NativeTile; }

describe("native view retirement", () => {
  it("retires text that was considered reusable but then merged into a preceding text tile", () => {
    const view = new EditorView({ doc: "tail\nsecond", parent: document.body });
    try {
      const previous = tileOf(view.contentDOM.firstChild!.firstChild!);
      view.dispatch({ changes: { from: 0, insert: "x" } });
      expect(view.state.doc.toString()).toBe("xtail\nsecond");
      expect(previous.parent).toBeNull();
    } finally { view.destroy(); }
  });

  it("retires DOM-only tile ownership without destroying a transferred widget", () => {
    const destroyed: number[] = [], compartment = new Compartment();
    class Probe extends WidgetType {
      /** @param version - Widget revision whose disposal is observed. */
      constructor(readonly version: number) { super(); }
      /** @returns New widget content, only used on the initial mount. */
      override toDOM(): HTMLElement {
        const dom = document.createElement("span"); dom.dataset.retirementWidget = ""; dom.textContent = String(this.version); return dom;
      }
      /** @param dom - DOM transferred to the next widget revision. @returns Successful reuse without unmounting it. */
      override updateDOM(dom: HTMLElement): boolean { dom.textContent = String(this.version); return true; }
      /** Records genuine unmounts, including the final view destroy. */
      override destroy(): void { destroyed.push(this.version); }
    }
    /** @param version - Revision used to require a new tile with the same widget DOM. @returns Native decorations. */
    const decoration = (version: number) => EditorView.decorations.of(Decoration.set([Decoration.widget({ widget: new Probe(version), side: 1 }).range(1)]));
    const view = new EditorView({ state: EditorState.create({ doc: "text\nother", extensions: compartment.of(decoration(0)) }), parent: document.body });
    try {
      const dom = view.contentDOM.querySelector<HTMLElement>("[data-retirement-widget]")!;
      for (let version = 1; version <= 3; version++) {
        const previous = tileOf(dom);
        view.dispatch({ effects: compartment.reconfigure(decoration(version)) });
        expect(view.contentDOM.querySelector("[data-retirement-widget]")).toBe(dom);
        expect(tileOf(dom)).not.toBe(previous);
        expect(previous.parent).toBeNull();
        expect(tileOf(dom).parent).not.toBeNull();
        expect(destroyed).toEqual([]);
      }
      // Full reuse keeps its active ancestry, while destruction is still exactly once.
      const active = tileOf(dom);
      view.dispatch({ changes: { from: view.state.doc.length, insert: "!" } });
      expect(tileOf(dom)).toBe(active); expect(active.parent).not.toBeNull();
    } finally { view.destroy(); }
    expect(destroyed).toEqual([3]);
  });
});
