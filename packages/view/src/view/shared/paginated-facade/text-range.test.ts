import { QuireEditor } from "@quirekit/core";
import { StarterKit } from "@quirekit/starter-kit";
import { describe, expect, it, vi } from "vitest";
import type { QuireViewRenderResult } from "../../types";
import { createMountedPaginatedGeometryFacade } from "./geometry";

/** @returns Current source-backed two-line geometry with an observable local-context accessor. */
function fixture() {
  const editor = new QuireEditor({ extensions: [StarterKit], content: { type: "doc",
    content: [{ type: "paragraph", content: [{ type: "text", text: "abcdef" }] }] } });
  const document = editor.state.doc;
  const snapshot = { state: editor.state, documentRect: { x: 0, y: 0, width: 200, height: 100 },
    viewportRect: { x: 0, y: 0, width: 200, height: 100 }, hitTargets: [], domOverlays: [], viewGraph: { version: 17 },
    root: { id: "root", kind: "block", range: { from: 0, to: document.content.size },
      rect: { x: 0, y: 0, width: 200, height: 100 }, children: [{ id: "paragraph", kind: "block",
        range: { from: 0, to: document.content.size }, rect: { x: 0, y: 0, width: 200, height: 100 },
        subLayoutQueryProducts: { caretStops: [], lineRanges: [], inputAnchors: [], selectionRects: [
          { textFragmentId: "line-1", range: { from: 1, to: 4 }, rect: { x: 10, y: 10, width: 30, height: 20 } },
          { textFragmentId: "line-2", range: { from: 4, to: 7 }, rect: { x: 10, y: 40, width: 30, height: 20 } }
        ] } }] } };
  let result: QuireViewRenderResult | undefined = { layoutSnapshot: snapshot, interactionSnapshot: snapshot } as unknown as QuireViewRenderResult;
  const readSelectionContext = vi.fn(() => { throw new Error("A remote range must not borrow local selection ownership"); });
  const facade = createMountedPaginatedGeometryFacade({ backendLabel: "Test", readRenderResult: () => result,
    readSelectionContext, readSurface: () => ({ clientRect: { left: 100, top: 50, width: 400, height: 200 },
      surfaceBounds: { x: 0, y: 0, width: 200, height: 100 } }) });
  return { editor, document, facade, readSelectionContext, clear: () => { result = undefined; } };
}

describe("passive source-bound text range queries", () => {
  it("projects separate line bands without selection, dispatch or local context reads", () => {
    const f = fixture();
    try {
      const state = f.editor.state.pm;
      const transaction = vi.fn();
      f.editor.on("transaction", transaction);
      expect(f.facade.getTextRangeRects({ from: 1, to: 7 }, f.document)).toEqual([
        { x: 120, y: 70, width: 60, height: 40 }, { x: 120, y: 130, width: 60, height: 40 }
      ]);
      expect(f.editor.state.pm).toBe(state);
      expect(transaction).not.toHaveBeenCalled();
      expect(f.readSelectionContext).not.toHaveBeenCalled();
    } finally { f.editor.destroy(); }
  });

  it("refuses stale source, invalid ranges and unavailable frames", () => {
    const f = fixture();
    try {
      const stale = f.document.type.create(f.document.attrs, f.document.content);
      expect(f.facade.getTextRangeRects({ from: 1, to: 7 }, stale)).toBeNull();
      for (const range of [{ from: -1, to: 7 }, { from: 2, to: 1 }, { from: 1, to: 99 }, { from: 1.5, to: 7 }]) {
        expect(f.facade.getTextRangeRects(range, f.document)).toBeNull();
      }
      f.clear();
      expect(f.facade.getTextRangeRects({ from: 1, to: 7 }, f.document)).toBeNull();
    } finally { f.editor.destroy(); }
  });
});
