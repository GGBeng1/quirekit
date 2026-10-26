import { expect, it } from "vitest";
import { EditorSelection } from "@quirekit/cm-state";
import type { EditorView } from "@quirekit/cm-view";
import { measureMobileSelection } from "./geometry";

it("projects scaled endpoints with two reads and avoids offscreen source positions", () => {
  const positions: number[] = [];
  let selection = EditorSelection.single(3, 8);
  const view = { scaleX: 2, scaleY: 2, state: { get selection() { return selection; } }, visibleRanges: [{ from: 0, to: 10 }],
    contentDOM: { querySelector: () => null },
    dom: { getBoundingClientRect: () => ({ left: 10, top: 20 }), ownerDocument: { defaultView: { innerHeight: 700 } } },
    scrollDOM: { getBoundingClientRect: () => ({ left: 10, right: 300, top: 20, bottom: 700 }) },
    coordsAtPos: (pos: number) => { positions.push(pos); return { left: pos * 20 + 10, top: 60, bottom: 100 }; },
    domAtPos: () => ({ node: { nodeType: 3, parentElement: { closest: () => ({ getBoundingClientRect: () => ({ height: 40 }) }) } } }),
  } as unknown as EditorView;
  expect(measureMobileSelection(view)).toEqual({ type: "range", anchor: { x: 30, y: 20, height: 20 }, focus: { x: 80, y: 20, height: 20 }, backward: false });
  expect(positions).toEqual([3, 8]);
  selection = EditorSelection.single(3, 30);
  positions.length = 0;
  expect(measureMobileSelection(view)).toMatchObject({ anchor: { x: 30 }, focus: null });
  expect(positions).toEqual([3]);
});
