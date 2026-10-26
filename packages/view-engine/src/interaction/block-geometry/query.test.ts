import { Schema } from "@quirekit/pm";
import { describe, expect, it, vi } from "vitest";
import { createQuireLayoutInteractionQueryIndex } from "../../layout/query-index";
import type { QuireLayoutNode, QuireLayoutPage, QuireLayoutProductSnapshot } from "../../layout/types";
import { queryQuireBlockFragments } from "./query";

const schema = new Schema({ nodes: { doc: { content: "paragraph+" }, paragraph: { content: "text*", group: "block", attrs: { blockId: { default: "a" } } }, text: { group: "inline" } } });
const doc = schema.node("doc", null, [schema.node("paragraph", null, schema.text("a".repeat(100))), schema.node("paragraph", { blockId: "b" }, schema.text("end"))]);
/** @param from - Logical fragment start. @param to - Logical fragment end. @param y - Page fragment origin. @returns Exact retained occurrence. */
function fragment(from: number, to: number, y: number): QuireLayoutNode {
  const rect = { x: 20, y, width: 400, height: 80 };
  return { id: `fragment-${y}`, kind: "block", range: { from, to }, rect,
    layoutOwner: { region: { rootId: { value: "root" }, regionId: { value: "body" }, kind: "body" },
      source: { sourceId: "body", range: { from: 0, to: doc.content.size } },
      capabilities: { editable: true, selectable: true, focusable: true, copyable: true, commandable: true, accessible: true } },
    textFragments: [{ id: `text-${y}`, text: "a", range: { from: from + 1, to }, rect, font: "16px sans-serif", lineHeight: 20, baseline: y + 16, caretStops: [] }]
  };
}
/** @param children - Realized and estimated retained nodes. @returns Indexed product fixture. */
function snapshot(children: readonly QuireLayoutNode[]): QuireLayoutProductSnapshot {
  const documentRect = { x: 0, y: 0, width: 500, height: 12000 };
  const root: QuireLayoutNode = { id: "root", kind: "block", range: { from: 0, to: doc.content.size }, rect: documentRect, children };
  return { root, documentRect, interactionQueryIndex: createQuireLayoutInteractionQueryIndex({ root, viewportRect: documentRect }) } as QuireLayoutProductSnapshot;
}

describe("logical block occurrences", () => {
  it("keeps the exact page boundary available below its last block without searching other pages", () => {
    const product = snapshot([fragment(0, 102, 0), fragment(102, 107, 5000)]);
    const indexed = { ...product, interactionQueryIndex: createQuireLayoutInteractionQueryIndex({ root: product.root, pages: [
      { pageIndex: 0, pageRect: { x: 0, y: 0, width: 500, height: 1200 } },
      { pageIndex: 1, pageRect: { x: 0, y: 5000, width: 500, height: 1200 } }
    ] as QuireLayoutPage[] }) };
    expect(queryQuireBlockFragments(indexed, doc, 1000)).toMatchObject([{ from: 0, to: 102, first: true, last: true }]);
    expect(queryQuireBlockFragments(indexed, doc, 1210)).toMatchObject([{ from: 0, to: 102, first: true, last: true }]);
    expect(queryQuireBlockFragments(indexed, doc, 3000)).toEqual([]);
    expect(queryQuireBlockFragments(product, doc, 1000)).toEqual([]);
  });
  it("projects realized nested paragraphs to the complete declared container", () => {
    const nested = new Schema({ nodes: { doc: { content: "block+" }, container: { content: "block+", group: "block", attrs: { blockId: { default: null } } }, paragraph: { content: "text*", group: "block", attrs: { blockId: { default: null } } }, text: { group: "inline" } } });
    const paragraph = nested.node("paragraph", null, nested.text("text"));
    const source = nested.node("doc", null, nested.node("container", { blockId: "outer" }, nested.node("container", null, [paragraph, paragraph])));
    const product = snapshot([fragment(2, 8, 0), fragment(8, 14, 100)]);
    const occurrences = queryQuireBlockFragments(product, source, 70);
    expect(occurrences).toMatchObject([
      { from: 0, to: 16, first: true, last: false },
      { from: 0, to: 16, first: false, last: true }
    ]);
    const identifiedParagraph = nested.node("paragraph", { blockId: "previous-root" }, nested.text("text"));
    const wrapped = nested.node("doc", null, nested.node("container", { blockId: "outer" }, nested.node("container", null, [identifiedParagraph, paragraph])));
    expect(queryQuireBlockFragments(product, wrapped, 70).filter(item => item.from === 0)).toEqual(occurrences);
  });
  it("uses fragment ranges, not the shared Story source range, across continuation pages", () => {
    const product = snapshot([fragment(0, 30, 0), fragment(30, 70, 1000), fragment(70, 102, 2000), fragment(102, 107, 2080)]);
    expect(queryQuireBlockFragments(product, doc, 40)).toMatchObject([{ from: 0, to: 102, first: true, last: false }]);
    expect(queryQuireBlockFragments(product, doc, 1040)).toMatchObject([{ from: 0, to: 102, first: false, last: false }]);
    expect(queryQuireBlockFragments(product, doc, 2040)).toMatchObject([{ from: 0, to: 102, first: false, last: true }, { from: 102, to: 107, first: true, last: true }]);
  });
  it("excludes estimates, repeated paint, transformed objects and foreign regions", () => {
    const base = fragment(0, 102, 0);
    const product = snapshot([
      { ...base, textFragments: [] }, { ...base, interactionRole: "paint-only" },
      { ...base, paintTransform: { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 } },
      { ...base, layoutOwner: { ...base.layoutOwner!, region: { ...base.layoutOwner!.region, kind: "table-cell" } } },
      { ...base, layoutOwner: { ...base.layoutOwner!, capabilities: { ...base.layoutOwner!.capabilities, editable: false } } }
    ]);
    expect(queryQuireBlockFragments(product, doc, 40)).toEqual([]);
  });
  it("only resolves nearby candidates even when retained geometry has thousands of blocks", () => {
    const product = snapshot(Array.from({ length: 2000 }, (_, i) => fragment(0, 102, i * 100)));
    const resolve = vi.spyOn(doc, "nodeAt");
    const serialize = vi.spyOn(doc, "toJSON");
    try {
      expect(queryQuireBlockFragments(product, doc, 1040).length).toBeLessThan(6);
      expect(resolve.mock.calls.length).toBeLessThan(6);
      expect(serialize).not.toHaveBeenCalled();
    } finally { resolve.mockRestore(); serialize.mockRestore(); }
  });
});
