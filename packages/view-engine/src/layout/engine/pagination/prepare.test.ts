import { describe, expect, it } from "vitest";
import { createQuirePaginationCheckpointStore } from "@quirekit/layout/pagination";
import type { QuireMeasuredContainerItem } from "@quirekit/layout/pagination";
import type { QuireRect } from "@quirekit/renderer";
import type { QuireLayoutBox, QuireLayoutDocument } from "../types";
import {
  paginateQuireLayoutDocument,
  prepareQuireLayoutDocumentPagination
} from ".";
import { projectQuireLayoutDocumentToPages } from "./projection";
import {
  createLayoutDocument,
  createLineFragments,
  createPageGeometry
} from "../../../../test-support/layout/pagination";

describe("prepared layout pagination", () => {
  it("retains source coordinates and complete page context before any projection", () => {
    const document = createSourceDocument(4);
    const original = JSON.stringify(document);
    const phases: string[] = [];
    const prepared = prepareQuireLayoutDocumentPagination({
      document,
      pageGeometry: createPageGeometry(48),
      trace: (phase) => phases.push(phase.name)
    });

    expect(prepared.children).toBe(document.children);
    expect(prepared.anchors).toBe(document.anchors);
    expect(prepared.hitTargets).toBe(document.hitTargets);
    expect(prepared.pages).toHaveLength(4);
    expect(prepared.pages.map((page) => page.sourceFlowY)).toEqual([0, 48, 96, 144]);
    expect(prepared.pages.map((page) => page.sourceFragments?.length)).toEqual([2, 2, 2, 2]);
    expect(prepared.rect).toEqual({ x: 0, y: 0, width: 600, height: 3200 });
    expect(phases.filter((name) => name === "layout:paginate:drive")).toHaveLength(1);
    expect(phases.some((name) => name.startsWith("layout:paginate:project"))).toBe(false);
    expect(JSON.stringify(document)).toBe(original);
  });

  const windows: readonly (readonly QuireRect[] | undefined)[] = [
    undefined,
    [],
    [{ x: 0, y: 0, width: 0, height: 800 }],
    [{ x: 0, y: 0, width: 600, height: 800 }],
    [{ x: 0, y: 1600, width: 600, height: 800 }],
    [{ x: 0, y: 0, width: 600, height: 800 }, { x: 0, y: 2400, width: 600, height: 800 }],
    [{ x: 0, y: 5000, width: 600, height: 800 }]
  ];

  it.each(windows.map((clips, index) => ({ clips, index })))(
    "matches compatibility projection for window $index without modifying the source",
    ({ clips }) => {
      const document = createSourceDocument(4);
      const pageGeometry = createPageGeometry(48);
      const prepared = prepareQuireLayoutDocumentPagination({ document, pageGeometry });
      const original = JSON.stringify(prepared);
      const projected = projectQuireLayoutDocumentToPages({
        document: prepared,
        sourceFlowX: document.rect.x,
        projectionClipRects: clips
      });
      const compatibility = paginateQuireLayoutDocument({ document, pageGeometry, projectionClipRects: clips });

      // The compatibility entry omits off-window provenance. All visible products
      // and every page's pagination geometry must still match the prepared path.
      expect({ ...projected, pages: [] }).toEqual({ ...compatibility, pages: [] });
      expect(projected.pages.map(withoutSourceContext)).toEqual(compatibility.pages.map(withoutSourceContext));
      expect(JSON.stringify(prepared)).toBe(original);
    }
  );

  it("projects A to B to A from the same source without accumulating offsets", () => {
    const document = createSourceDocument(4);
    const prepared = prepareQuireLayoutDocumentPagination({ document, pageGeometry: createPageGeometry(48) });
    const original = JSON.stringify(prepared);
    const clip = { x: 0, y: 0, width: 600, height: 800 };
    const project = () => projectQuireLayoutDocumentToPages({
      document: prepared,
      sourceFlowX: document.rect.x,
      projectionClipRects: [clip]
    });
    const first = project();
    const firstValue = JSON.stringify(first);
    clip.y = 1600;
    const other = project();
    expect(other.children).not.toEqual(first.children);
    clip.y = 0;
    expect(project()).toEqual(first);
    expect(JSON.stringify(first)).toBe(firstValue);
    expect(JSON.stringify(prepared)).toBe(original);
  });

  it("does not reuse a clipped checkpoint prefix as complete page provenance", () => {
    const document = createSourceDocument(4);
    const pageGeometry = createPageGeometry(48);
    const paginationCheckpointStore = createQuirePaginationCheckpointStore();
    const clipped = paginateQuireLayoutDocument({
      document,
      pageGeometry,
      paginationCheckpointStore,
      projectionClipRects: [{ x: 0, y: 0, width: 600, height: 800 }]
    });
    expect(clipped.pages[1]?.sourceFlowY).toBeUndefined();

    // A suffix dirty range would otherwise admit the old off-window prefix.
    // Different collection coverage must keep these checkpoint streams separate.
    const prepared = prepareQuireLayoutDocumentPagination({
      document,
      pageGeometry,
      paginationCheckpointStore,
      layoutDirtyRange: {
        reason: "content",
        changedRange: { from: 19, to: 20 },
        firstTopLevelBlockIndex: 0,
        firstTopLevelBlockRange: document.children[0]!.range
      }
    });
    expect(prepared.pages.map((page) => page.sourceFlowY)).toEqual([0, 48, 96, 144]);
    expect(prepared.pages.map((page) => page.sourceFragments?.length)).toEqual([2, 2, 2, 2]);
    expect(paginationCheckpointStore.snapshot().prefixPagesReused).toBe(0);
  });

  it.each([125, 1250])("retains existing source references for %i pages without projecting all boxes", (pageCount) => {
    const document = createSourceDocument(pageCount);
    const itemsByBox = new Map<QuireLayoutBox, readonly QuireMeasuredContainerItem[]>();
    const phases: string[] = [];
    const trace = (phase: { readonly name: string }) => phases.push(phase.name);
    const prepared = prepareQuireLayoutDocumentPagination({
      document,
      pageGeometry: createPageGeometry(48),
      measuredSourceCache: {
        get: (box) => itemsByBox.get(box),
        set: (box, items) => { itemsByBox.set(box, items); }
      },
      trace
    });
    const measuredItems = [...itemsByBox.values()].flat();
    const sources = measuredItems.flatMap((item) => item.sourceFragments ?? []);
    const pageSources = prepared.pages.flatMap((page) => page.sourceFragments ?? []);

    expect(prepared.pages).toHaveLength(pageCount);
    expect(measuredItems).toHaveLength(pageCount * 2);
    expect(pageSources).toHaveLength(pageCount * 2);
    expect(pageSources.every((source, index) => source === sources[index])).toBe(true);
    expect(prepared.children).toBe(document.children);
    expect(phases.some((name) => name.startsWith("layout:paginate:project"))).toBe(false);

    for (const pageIndex of [0, pageCount - 1, 0]) {
      const projected = projectQuireLayoutDocumentToPages({
        document: prepared,
        sourceFlowX: document.rect.x,
        projectionClipRects: [prepared.pages[pageIndex]!.pageRect],
        trace
      });
      expect(projected.children).toHaveLength(1);
      expect(projected.children[0]?.textFragments).toHaveLength(2);
    }
    expect(phases.filter((name) => name === "layout:paginate:measured-source")).toHaveLength(1);
    expect(phases.filter((name) => name === "layout:paginate:drive")).toHaveLength(1);
  });
});

/**
 * Creates one long paragraph with two source lines per page and a nonzero x origin.
 *
 * @param pageCount - Number of fixed-height pages to produce.
 * @returns Source document whose original coordinates must survive page preparation.
 */
function createSourceDocument(pageCount: number): QuireLayoutDocument {
  const base = createLayoutDocument([{
    id: "paragraph",
    from: 1,
    to: 1 + pageCount * 6,
    y: 0,
    height: pageCount * 48,
    textFragments: createLineFragments({ lineCount: pageCount * 2, y: 0 })
  }]);
  return {
    ...base,
    rect: { ...base.rect, x: 13 },
    children: base.children.map((box) => ({
      ...box,
      rect: { ...box.rect, x: 13 },
      textFragments: box.textFragments?.map((fragment) => ({ ...fragment, rect: { ...fragment.rect, x: 13 } }))
    }))
  };
}

/**
 * Compares pagination geometry independently from optional source provenance.
 *
 * @param page - Page with full or clipped source-context metadata.
 * @returns Shared page geometry and continuation contract.
 */
function withoutSourceContext(page: QuireLayoutDocument["pages"][number]) {
  const { sourceFlowY: _y, sourceFlowHeight: _height, sourceFragments: _fragments, ...geometry } = page;
  return geometry;
}
