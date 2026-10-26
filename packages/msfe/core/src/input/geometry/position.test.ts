import { describe, expect, it, vi } from "vitest";
import { EditorState } from "@quirekit/cm-state";
import { Decoration, EditorView } from "@quirekit/cm-view";
import { sourceInputPosition, sourceCaretRect, sourceCaretSide } from "./position";

/** @param invisible - Source lines that have no rendered height. @param atoms - Hidden replacement intervals. @returns A bounded mounted-layout fixture. */
function fixture(invisible: number[] = [4], atoms: [number, number][] = []) {
  const state = EditorState.create({ doc: "abc\n\ndef", extensions: EditorView.atomicRanges.of(() => Decoration.set(atoms.map(([from, to]) => Decoration.replace({}).range(from, to)))) });
  const coords = vi.fn((pos: number, _side?: number) => ({ left: pos <= 3 ? pos * 10 : (pos - 5) * 10, right: 0, top: pos <= 4 ? 10 : 60, bottom: pos <= 4 ? 30 : 80 }));
  const blocks = vi.fn(() => [{ from: 0, to: 3 }, { from: 4, to: 4 }, { from: 5, to: 8 }]);
  const view = { state, posAtCoords: vi.fn(() => 4), visibleRanges: [{ from: 0, to: 8 }],
    get viewportLineBlocks() { return blocks(); }, coordsAtPos: coords,
    domAtPos: (pos: number) => ({ node: { nodeType: 3, parentElement: { closest: () => ({ getBoundingClientRect: () => ({ height: invisible.includes(pos) ? 0 : 20 }) }) } } }),
  } as unknown as EditorView;
  return { view, coords, blocks };
}

describe("visible source hit acceptance", () => {
  it("snaps zero-height separators to the nearer visible side even with a phantom text rect", () => {
    const { view } = fixture();
    expect(sourceInputPosition(view, { x: 30, y: 35 })).toBe(3);
    expect(sourceInputPosition(view, { x: 0, y: 55 })).toBe(5);
  });

  it("never accepts inside an atomic replacement and preserves the fast path", () => {
    const { view, blocks } = fixture([], [[1, 3]]);
    vi.mocked(view.posAtCoords).mockReturnValue(2);
    expect(sourceInputPosition(view, { x: 10, y: 20 })).toBe(3);
    expect(blocks).not.toHaveBeenCalled();
  });

  it("retains the previous accepted selection when no mounted caret can be proven", () => {
    const { view } = fixture([0, 3, 4, 5, 8]);
    expect(sourceInputPosition(view, { x: 10, y: 40 })).toBeNull();
    vi.mocked(view.posAtCoords).mockReturnValue(null);
    expect(sourceInputPosition(view, { x: 10, y: 4000 })).toBeNull();
  });

  it("keeps a fence/heading boundary measurable by using the visible association", () => {
    const { view } = fixture([]);
    vi.mocked(view.coordsAtPos).mockImplementation((_pos, side) => side === 1 ? { left: 30, right: 30, top: 50, bottom: 50 } : { left: 30, right: 30, top: 10, bottom: 30 });
    expect(sourceCaretRect(view, 3)).toMatchObject({ top: 10, bottom: 30 });
    expect(view.coordsAtPos).toHaveBeenCalledTimes(2);
    vi.mocked(view.coordsAtPos).mockClear();
    expect(sourceCaretRect(view, 3, -1)).toMatchObject({ top: 10, bottom: 30 });
    expect(view.coordsAtPos).toHaveBeenCalledTimes(1);
  });

  it("uses real text beside an atomic boundary instead of its full-row buffer rectangle", () => {
    const { view, coords, blocks } = fixture([], [[1, 3]]);
    view.domAtPos = vi.fn((_pos, side) => ({ node: { nodeType: side === -1 ? 3 : 1,
      parentElement: { closest: () => ({ getBoundingClientRect: () => ({ height: 40 }) }) },
      closest: () => ({ getBoundingClientRect: () => ({ height: 40 }) }), childNodes: [] }, offset: 0 })) as unknown as EditorView["domAtPos"];
    coords.mockImplementation((_pos, side) => ({ left: side === -1 ? 10 : 50, right: 50, top: side === -1 ? 10 : 0, bottom: side === -1 ? 30 : 40 }));
    vi.mocked(view.posAtCoords).mockReturnValue(1);
    expect(sourceCaretRect(view, 1)).toMatchObject({ left: 10, top: 10, bottom: 30 });
    expect(sourceInputPosition(view, { x: 50, y: 20 })).toBe(1);
    expect(blocks).not.toHaveBeenCalled();
    expect(coords).toHaveBeenCalledTimes(2);
    expect(coords.mock.calls.every(([, side]) => side === -1)).toBe(true);
    expect(sourceCaretSide(view, 1, 1)).toBe(-1);
  });

  it("moves an outer buffer hit to the adjacent atom endpoint without scanning mounted rows", () => {
    const { view, blocks } = fixture([], [[0, 1]]);
    const line = { getBoundingClientRect: () => ({ height: 40 }) };
    view.domAtPos = ((pos: number) => ({ node: pos === 0 ? { nodeType: 1, closest: () => line, childNodes: [] }
      : { nodeType: 3, parentElement: { closest: () => line } }, offset: 0 })) as unknown as EditorView["domAtPos"];
    vi.mocked(view.posAtCoords).mockReturnValue(0);
    expect(sourceCaretRect(view, 0)).toBeNull();
    expect(sourceInputPosition(view, { x: 0, y: 20 })).toBe(1);
    expect(blocks).not.toHaveBeenCalled();
  });

  it("keeps a separator fallback on the nearest text even when that row starts with an atom", () => {
    const { view } = fixture([0, 3, 4], [[5, 6]]), domAtPos = view.domAtPos;
    view.domAtPos = ((pos: number, side: -1 | 1) => pos === 5 ? { node: { nodeType: 1, childNodes: [],
      closest: () => ({ getBoundingClientRect: () => ({ height: 20 }) }) }, offset: 0 } : domAtPos(pos, side)) as EditorView["domAtPos"];
    expect(sourceInputPosition(view, { x: 0, y: 55 })).toBe(6);
  });
});
