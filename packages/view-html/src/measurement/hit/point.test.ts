import { afterEach, expect, it, vi } from "vitest";
import { getChangedRanges } from "@quirekit/core";
import { createGapFixture } from "./test-support/fixture";
import * as regions from "./regions";

const fixtures: ReturnType<typeof createGapFixture>[] = [];
/** @returns Test-owned fixture, disposed after each assertion. */
function fixture(): ReturnType<typeof createGapFixture> { const value = createGapFixture(); fixtures.push(value); return value; }
afterEach(() => { for (const value of fixtures.splice(0)) { value.view.destroy(); value.editor.destroy(); } vi.restoreAllMocks(); });

it("uses vertical gap ownership instead of either edge of the document shell", () => {
  const f = fixture(), atom = f.view.root.children[1]!;
  // Browsers can nominate private opaque DOM or the document shell in margins.
  for (const node of [atom.mount!.dom, f.view.root.mount!.dom]) {
    f.document.caretPositionFromPoint = () => ({ offsetNode: node, offset: 0, getClientRect: () => null });
    for (const x of [22, 418]) {
      expect(f.provider.posAtClientPoint(x, 105)).toMatchObject({ pos: atom.range.from, descriptorId: atom.id });
      expect(f.provider.posAtClientPoint(x, 175)).toMatchObject({ pos: atom.range.to, descriptorId: atom.id });
      expect(f.provider.posAtClientPoint(x, 175)?.nodeSelection).toBeUndefined();
    }
  }
});

it("projects a gap into the local textblock and rejects a different block's browser caret", () => {
  const f = fixture(), first = f.provider.domAtPos(3), other = f.provider.domAtPos(11);
  const calls: number[][] = [];
  f.document.caretPositionFromPoint = (x, y) => {
    calls.push([x, y]); const point = y < 70 ? first : other;
    return { offsetNode: point.node, offset: point.offset, getClientRect: () => null };
  };
  expect(f.provider.posAtClientPoint(22, 75)?.pos).toBe(3);
  expect(calls).toEqual([[22, 75], [22, 69]]);
  f.document.caretPositionFromPoint = () => ({ offsetNode: other.node, offset: other.offset, getClientRect: () => null });
  expect(f.provider.posAtClientPoint(22, 75)?.pos).toBe(7);
  expect(f.provider.getRangeReadCount()).toBe(0);
});

it("keeps nested padding and empty textblocks in their own content range", () => {
  const f = fixture(), quote = f.view.root.children[3]!;
  f.document.elementFromPoint = () => quote.mount!.dom as Element;
  const result = f.provider.posAtClientPoint(22, 265);
  expect(result!.pos).toBe(quote.range.from + 2);
  expect(result!.pos).toBeLessThan(quote.range.to);
  const empty = "children" in quote ? quote.children[1]! : undefined;
  expect(f.provider.posAtClientPoint(418, 335)?.pos).toBe(empty!.range.from + 1);
});

it("reuses identical geometry, projects scrolling live, and rejects stale documents", () => {
  const build = vi.spyOn(regions, "createHtmlBlockHitTree"), f = fixture();
  f.provider.updateBlockGeometry(f.root, f.editor.state.doc);
  expect(build).toHaveBeenCalledTimes(1);
  const before = f.provider.posAtClientPoint(22, 175);
  f.scroll(90);
  expect(f.provider.posAtClientPoint(22, 85)).toEqual(before);
  const transaction = f.editor.state.pm.tr.insertText("changed ", 1);
  f.editor.dispatchTransaction(transaction);
  f.view.update({ documentNode: f.editor.state.doc, mapping: transaction.mapping, changedRanges: getChangedRanges(transaction) });
  expect(f.provider.posAtClientPoint(22, 85)).toBeNull();
  f.publish();
  expect(build).toHaveBeenCalledTimes(2);
  expect(f.provider.posAtClientPoint(22, 85)?.pos).toBe(before!.pos + 8);
});

it("accepts direct text once and does not map hits on outside UI", () => {
  const f = fixture(), point = f.provider.domAtPos(3);
  f.document.elementFromPoint = () => point.node.parentNode as Element;
  const caret = vi.fn(() => ({ offsetNode: point.node, offset: point.offset, getClientRect: () => null }));
  f.document.caretPositionFromPoint = caret;
  const boxes = vi.spyOn(f.surface, "getBoundingClientRect");
  expect(f.provider.posAtClientPoint(30, 60)?.pos).toBe(3);
  expect(caret).toHaveBeenCalledTimes(1); expect(boxes).not.toHaveBeenCalled();
  f.document.elementFromPoint = () => f.document.createElement("button");
  expect(f.provider.posAtClientPoint(30, 60)).toBeNull();
});
