import { describe, expect, it } from "vitest";
import { markQuireTextFragmentsSortedByLineTop } from "@quirekit/layout/text";
import { paginateQuireLayoutDocument } from ".";
import type {
  QuireLayoutBox,
  QuireLayoutContainer,
  QuireLayoutDocument
} from "../types";
import type {
  QuireTableCellFragment,
  QuireTableHitTarget
} from "../table";
import type { QuireLayoutBoxSubLayoutFragment } from "../sub-layout";
import { projectQuireLayoutDocumentToPages } from "./projection";
import {
  createEmptyAnchorRegionProducts,
  createPageGeometry
} from "../../../../test-support/layout/pagination";
import { retainQuireTestTableCellSubLayoutIdentity } from "../../../../test-support/layout/table-cell-sub-layout";

describe("canvas layout page projection", () => {
  it("translates table metadata with the owning layout box", () => {
    const projected = projectQuireLayoutDocumentToPages({
      document: createDocumentWithTableOnSecondPage()
    });
    const table = projected.children[0]?.table;

    expect(projected.children[0]?.rect.y).toBe(850);
    expect(table?.rect.y).toBe(850);
    expect(table?.tracks.map((track) => track.x)).toEqual([40, 290]);
    expect(table?.rows.map((row) => row.rect.y)).toEqual([850, 884]);
    expect(table?.cells[0]?.rect).toEqual({ x: 40, y: 850, width: 250, height: 34 });
    expect(table?.cells[0]?.contentRect).toEqual({
      x: 45,
      y: 855,
      width: 240,
      height: 24
    });
    expect(table?.hitTargets[0]?.rect).toEqual({
      x: 40,
      y: 850,
      width: 250,
      height: 34
    });
  });

  it("projects inline source anchor geometry without changing logical identity", () => {
    const document = createDocumentWithTableOnSecondPage();
    const owner = {
      region: {
        rootId: { value: "root:body" },
        regionId: { value: "region:body" },
        kind: "body" as const
      },
      source: {
        sourceId: "doc:body",
        range: document.range
      },
      capabilities: {
        editable: true,
        selectable: true,
        focusable: true,
        copyable: true,
        commandable: true,
        accessible: true
      }
    };
    const anchor = {
      id: "paragraph:inline-source:0:attachment",
      sourceAnchorId: "paragraph:inline-source:0:attachment",
      kind: "inline-source" as const,
      nodeType: "attachment",
      range: { from: 23, to: 24 },
      position: { pos: 23, bias: 1 as const },
      affinity: "before" as const,
      occurrence: { kind: "single" as const },
      rect: { x: 20, y: 52, width: 0, height: 18 },
      placementReferences: {
        anchor: { x: 20, y: 52, width: 0, height: 18 },
        line: { x: 20, y: 52, width: 240, height: 18 },
        paragraph: { x: 20, y: 52, width: 500, height: 36 },
        containingRegion: { x: 0, y: 0, width: 520, height: 740 }
      },
      owner
    };

    const projected = projectQuireLayoutDocumentToPages({
      document: {
        ...document,
        anchors: [anchor],
        sourceCapabilities: [{
          sourceAnchorId: anchor.sourceAnchorId,
          nodeType: anchor.nodeType,
          status: "gap",
          gaps: [{
            code: "invalid-source-declaration",
            nodeType: anchor.nodeType,
            message: "Attachment placement is invalid."
          }]
        }, {
          sourceAnchorId: "off-window:inline-source:attachment",
          nodeType: "attachment",
          status: "gap",
          gaps: [{
            code: "invalid-source-declaration",
            nodeType: "attachment",
            message: "Off-window attachment placement is invalid."
          }]
        }]
      }
    });

    expect(projected.anchors).toEqual([{
      ...anchor,
      id: "paragraph:inline-source:0:attachment:occurrence:page:1:root:body:region:body",
      occurrence: {
        kind: "page",
        pageIndex: 1,
        visualInstanceId: "page:1:root:body:region:body"
      },
      rect: { x: 60, y: 854, width: 0, height: 18 },
      placementReferences: {
        anchor: { x: 60, y: 854, width: 0, height: 18 },
        line: { x: 60, y: 854, width: 240, height: 18 },
        paragraph: { x: 60, y: 854, width: 500, height: 36 },
        containingRegion: { x: 40, y: 802, width: 520, height: 740 },
        column: { x: 40, y: 850, width: 500, height: 700 },
        margin: { x: 40, y: 850, width: 500, height: 700 },
        page: { x: 0, y: 800, width: 600, height: 800 }
      },
      owner: {
        ...owner,
        region: {
          ...owner.region,
          visualInstanceId: "page:1:root:body:region:body"
        }
      }
    }]);
    expect(projected.sourceCapabilities).toHaveLength(1);
    expect(projected.sourceCapabilities?.[0]?.sourceAnchorId)
      .toBe(anchor.sourceAnchorId);
    expect(projected.anchorOccurrenceGaps).toEqual([]);
  });

  it("rebuilds document table hit targets from projected table fragments", () => {
    const staleHitTarget: QuireTableHitTarget = {
      id: "stale-document-hit-target",
      kind: "cell",
      tableId: "wordTable-0",
      semanticCellId: "semantic:r0:c0:g1:1",
      originExplicitCellId: "explicit:r0:c0",
      explicitCellIds: ["explicit:r0:c0"],
      originCellPos: 23,
      range: { from: 23, to: 27 },
      rect: { x: 0, y: 48, width: 250, height: 34 }
    };

    const projected = projectQuireLayoutDocumentToPages({
      document: {
        ...createDocumentWithTableOnSecondPage(),
        hitTargets: [staleHitTarget]
      }
    });
    const projectedTableHitTargets = projected.children.flatMap((box) =>
      box.table?.hitTargets ?? []
    );

    expect(projectedTableHitTargets).toHaveLength(1);
    expect(projected.hitTargets).toEqual(projectedTableHitTargets);
    expect(projected.hitTargets[0]?.id).toBe("wordTable-0:hit:semantic:r0:c0:g1:1");
    expect(projected.hitTargets[0]?.rect).toEqual({
      x: 40,
      y: 850,
      width: 250,
      height: 34
    });
  });

  it("projects only source boxes intersecting the active projection clip pages", () => {
    const projected = projectQuireLayoutDocumentToPages({
      document: createDocumentWithTwoClippedPages(),
      projectionClipRects: [{ x: 0, y: 800, width: 600, height: 800 }]
    });

    expect(projected.children.map((child) => child.id)).toEqual(["visible"]);
    expect(projected.children[0]?.rect).toEqual({
      x: 40,
      y: 850,
      width: 200,
      height: 20
    });
  });

  it("does not fall back to full projection when no page intersects the active clip", () => {
    const document = {
      ...createDocumentWithTwoClippedPages(),
      hitTargets: [{
        id: "source-hit",
        range: { from: 1, to: 10 },
        rect: { x: 0, y: 0, width: 200, height: 20 }
      }]
    };
    const projected = projectQuireLayoutDocumentToPages({
      document,
      projectionClipRects: [{ x: 0, y: 2400, width: 600, height: 800 }]
    });

    expect(projected.children).toEqual([]);
    expect(projected.hitTargets).toEqual([]);
    expect(projected.anchors).toEqual([]);
    expect(projected.anchorRegionProducts).toEqual(createEmptyAnchorRegionProducts());
    expect(projected.pages).toBe(document.pages);
    expect(projected.range).toEqual(document.range);
    expect(projected.rect).toEqual(document.rect);
    expect(document.children).toHaveLength(2);
    expect(document.hitTargets).toHaveLength(1);
  });

  it.each([false, true])(
    "preserves the source document without measured pagination (legacyPages=%s)",
    (legacyPages) => {
      const source = createDocumentWithTwoClippedPages();
      const document = {
        ...source,
        pages: legacyPages ? source.pages.map((page) => ({
          ...page,
          sourceFlowY: undefined,
          sourceFlowHeight: undefined
        })) : []
      };

      expect(projectQuireLayoutDocumentToPages({ document })).toBe(document);
      expect(projectQuireLayoutDocumentToPages({
        document,
        projectionClipRects: [{ x: 0, y: 0, width: 600, height: 800 }]
      })).toBe(document);

      const outside = projectQuireLayoutDocumentToPages({
        document,
        projectionClipRects: [{ x: 0, y: 2400, width: 600, height: 800 }]
      });
      if (legacyPages) {
        expect(outside.children).toEqual([]);
        expect(outside.pages).toBe(document.pages);
      } else {
        expect(outside).toBe(document);
      }
    }
  );

  it.each([false, true])(
    "excludes off-window nested text whose source y overlaps the active page (ordered=%s)",
    (ordered) => {
      const document = createNestedWindowProjectionDocument(ordered);
      const full = projectQuireLayoutDocumentToPages({ document });
      const windowed = projectQuireLayoutDocumentToPages({
        document,
        projectionClipRects: [document.pages[0]!.pageRect]
      });
      const fullLeaves = collectProjectionTextLeaves(full);

      expect(fullLeaves.map((box) => ({ id: box.id, y: box.rect.y }))).toEqual([
        { id: "visible", y: 410 },
        { id: "outside", y: 1020 }
      ]);
      expect(collectProjectionTextLeaves(windowed)).toEqual(
        fullLeaves.filter((box) => box.id === "visible")
      );
    }
  );

  it("keeps repeated A to B to A window projections identical to the complete text geometry", () => {
    const source = createNestedWindowProjectionDocument(true);
    const section = source.children[0] as QuireLayoutContainer;
    const emptyParagraph = createWindowProjectionTextLeaf("empty", 20, 140, true);
    const document = {
      ...source,
      children: [{
        ...section,
        children: [
          section.children[0]!,
          {
            ...emptyParagraph,
            textFragments: emptyParagraph.textFragments!.map((fragment) => ({
              ...fragment,
              text: "",
              range: { from: 26, to: 26 },
              rect: { ...fragment.rect, width: 0 },
              caretStops: [{ position: { pos: 26, bias: 1 as const }, localX: 0 }]
            }))
          },
          section.children[1]!
        ]
      }]
    };
    const unchangedSource = structuredClone(document);
    const full = projectQuireLayoutDocumentToPages({ document });
    const fullLeaves = collectProjectionTextLeaves(full);

    for (const pageIndex of [0, 1, 0, 1, 0]) {
      const windowed = projectQuireLayoutDocumentToPages({
        document,
        projectionClipRects: [document.pages[pageIndex]!.pageRect]
      });
      const expectedIds = pageIndex === 0 ? ["visible", "empty"] : ["outside"];
      const expected = fullLeaves.filter((box) => expectedIds.includes(box.id));

      expect(expected.map((box) => box.id)).toEqual(expectedIds);
      expect(collectProjectionTextLeaves(windowed)).toEqual(expected);
    }

    expect(document).toEqual(unchangedSource);
    expect(projectQuireLayoutDocumentToPages({ document })).toEqual(full);
  });

  it("drops a container's own off-window text while retaining its projected visible children", () => {
    const source = createNestedWindowProjectionDocument(false);
    const section = source.children[0] as QuireLayoutContainer;
    const outside = createWindowProjectionTextLeaf("container-text", 40, 410, false);
    const document = {
      ...source,
      children: [{
        ...section,
        textFragments: outside.textFragments,
        children: [section.children[0]!]
      }]
    };
    const windowed = projectQuireLayoutDocumentToPages({
      document,
      projectionClipRects: [document.pages[0]!.pageRect]
    });

    expect(collectProjectionTextLeaves(windowed).map((box) => box.id)).toEqual(["visible"]);
    expect(windowed.children[0]?.textFragments ?? []).toEqual([]);
    expect(document.children[0]?.textFragments).toBe(outside.textFragments);
  });

  it("projects regular table rows as page-local table fragments", () => {
    const projected = paginateQuireLayoutDocument({
      document: createDocumentWithFourRowTable(),
      pageGeometry: createPageGeometry(56)
    });

    expect(projected.pages.map((page) => page.range)).toEqual([
      { from: 11, to: 30 },
      { from: 31, to: 50 }
    ]);
    expect(
      projected.children.map((box) => ({
        id: box.id,
        range: box.range,
        rect: box.rect,
        fragmentId: box.table?.fragmentId,
        rows: box.table?.rows.map((row) => ({
          range: row.range,
          rowIndex: row.rowIndex,
          rect: row.rect
        })),
        cells: box.table?.cells.map((cell) => ({
          range: cell.range,
          semanticCellId: cell.semanticCellId,
          rect: cell.rect,
          contentRect: cell.contentRect
        })),
        hitTargets: box.table?.hitTargets.map((target) => ({
          semanticCellId: target.semanticCellId,
          rect: target.rect
        }))
      }))
    ).toEqual([
      {
        id: "wordTable-0:layout#p0",
        range: { from: 11, to: 30 },
        rect: { x: 40, y: 50, width: 500, height: 56 },
        fragmentId: "wordTable-0#p0",
        rows: [
          {
            range: { from: 11, to: 20 },
            rowIndex: 0,
            rect: { x: 40, y: 50, width: 500, height: 28 }
          },
          {
            range: { from: 21, to: 30 },
            rowIndex: 1,
            rect: { x: 40, y: 78, width: 500, height: 28 }
          }
        ],
        cells: [
          {
            range: { from: 11, to: 20 },
            semanticCellId: "semantic:r0:c0:g1:1",
            rect: { x: 40, y: 50, width: 500, height: 28 },
            contentRect: { x: 45, y: 55, width: 490, height: 18 }
          },
          {
            range: { from: 21, to: 30 },
            semanticCellId: "semantic:r1:c0:g1:1",
            rect: { x: 40, y: 78, width: 500, height: 28 },
            contentRect: { x: 45, y: 83, width: 490, height: 18 }
          }
        ],
        hitTargets: [
          {
            semanticCellId: "semantic:r0:c0:g1:1",
            rect: { x: 40, y: 50, width: 500, height: 28 }
          },
          {
            semanticCellId: "semantic:r1:c0:g1:1",
            rect: { x: 40, y: 78, width: 500, height: 28 }
          }
        ]
      },
      {
        id: "wordTable-0:layout#p1",
        range: { from: 31, to: 50 },
        rect: { x: 40, y: 850, width: 500, height: 56 },
        fragmentId: "wordTable-0#p1",
        rows: [
          {
            range: { from: 31, to: 40 },
            rowIndex: 2,
            rect: { x: 40, y: 850, width: 500, height: 28 }
          },
          {
            range: { from: 41, to: 50 },
            rowIndex: 3,
            rect: { x: 40, y: 878, width: 500, height: 28 }
          }
        ],
        cells: [
          {
            range: { from: 31, to: 40 },
            semanticCellId: "semantic:r2:c0:g1:1",
            rect: { x: 40, y: 850, width: 500, height: 28 },
            contentRect: { x: 45, y: 855, width: 490, height: 18 }
          },
          {
            range: { from: 41, to: 50 },
            semanticCellId: "semantic:r3:c0:g1:1",
            rect: { x: 40, y: 878, width: 500, height: 28 },
            contentRect: { x: 45, y: 883, width: 490, height: 18 }
          }
        ],
        hitTargets: [
          {
            semanticCellId: "semantic:r2:c0:g1:1",
            rect: { x: 40, y: 850, width: 500, height: 28 }
          },
          {
            semanticCellId: "semantic:r3:c0:g1:1",
            rect: { x: 40, y: 878, width: 500, height: 28 }
          }
        ]
      }
    ]);
  });

  it("uses measured source-flow height instead of page-local rect height for table row ownership", () => {
    const document = createDocumentWithFourRowTable();
    const projected = projectQuireLayoutDocumentToPages({
      document: {
        ...document,
        pages: [{
          pageIndex: 0,
          range: { from: 11, to: 30 },
          pageRect: { x: 0, y: 0, width: 600, height: 800 },
          bodyRect: { x: 40, y: 50, width: 500, height: 56 },
          rect: { x: 40, y: 50, width: 500, height: 56 },
          sourceFlowY: 0,
          sourceFlowHeight: 28,
          endInfo: { openMarks: [], openNodes: [] }
        }]
      }
    });

    expect(projected.children.map((box) => ({
      id: box.id,
      range: box.range,
      rows: box.table?.rows.map((row) => ({
        range: row.range,
        rowIndex: row.rowIndex,
        rect: row.rect
      })),
      cells: box.table?.cells.map((cell) => ({
        range: cell.range,
        semanticCellId: cell.semanticCellId,
        rect: cell.rect
      }))
    }))).toEqual([
      {
        id: "wordTable-0:layout#p0",
        range: { from: 11, to: 20 },
        rows: [{
          range: { from: 11, to: 20 },
          rowIndex: 0,
          rect: { x: 40, y: 50, width: 500, height: 28 }
        }],
        cells: [{
          range: { from: 11, to: 20 },
          semanticCellId: "semantic:r0:c0:g1:1",
          rect: { x: 40, y: 50, width: 500, height: 28 }
        }]
      }
    ]);
  });

  it("uses measured source-flow ownership before table row range intersection", () => {
    const document = createDocumentWithFourRowTable();
    const projected = projectQuireLayoutDocumentToPages({
      document: {
        ...document,
        pages: [{
          pageIndex: 1,
          range: { from: 100, to: 110 },
          pageRect: { x: 0, y: 800, width: 600, height: 800 },
          bodyRect: { x: 40, y: 850, width: 500, height: 28 },
          rect: { x: 40, y: 850, width: 500, height: 28 },
          sourceFlowY: 28,
          sourceFlowHeight: 28,
          endInfo: { openMarks: [], openNodes: [] }
        }]
      }
    });

    expect(projected.children.map((box) => ({
      id: box.id,
      range: box.range,
      rows: box.table?.rows.map((row) => ({
        id: row.id,
        range: row.range,
        rowIndex: row.rowIndex,
        rect: row.rect
      })),
      cells: box.table?.cells.map((cell) => ({
        id: cell.id,
        range: cell.range,
        semanticCellId: cell.semanticCellId,
        rect: cell.rect
      }))
    }))).toEqual([
      {
        id: "wordTable-0:layout#p1",
        range: { from: 21, to: 30 },
        rows: [{
          id: "wordTable-0:row-1#p1",
          range: { from: 21, to: 30 },
          rowIndex: 1,
          rect: { x: 40, y: 850, width: 500, height: 28 }
        }],
        cells: [{
          id: "wordTable-0:cell-1-0#p1",
          range: { from: 21, to: 30 },
          semanticCellId: "semantic:r1:c0:g1:1",
          rect: { x: 40, y: 850, width: 500, height: 28 }
        }]
      }
    ]);
  });

  it("keeps vertical merge continuation cells on page-local fragments", () => {
    const projected = paginateQuireLayoutDocument({
      document: createDocumentWithCrossPageVerticalMergeTable(),
      pageGeometry: createPageGeometry(28)
    });

    expect(
      projected.children.map((box) => ({
        id: box.id,
        range: box.range,
        rect: box.rect,
        cells: box.table?.cells.map((cell) => ({
          id: cell.id,
          semanticCellId: cell.semanticCellId,
          originExplicitCellId: cell.originExplicitCellId,
          range: cell.range,
          rect: cell.rect,
          contentRect: cell.contentRect
        })),
        hitTargets: box.table?.hitTargets.map((target) => ({
          semanticCellId: target.semanticCellId,
          originExplicitCellId: target.originExplicitCellId,
          range: target.range,
          rect: target.rect
        }))
      }))
    ).toEqual([
      {
        id: "wordTable-0:layout#p0",
        range: { from: 11, to: 20 },
        rect: { x: 40, y: 50, width: 500, height: 28 },
        cells: [
          {
            id: "wordTable-0:cell-0-0",
            semanticCellId: "semantic:r0:c0:g1:2",
            originExplicitCellId: "explicit:r0:c0",
            range: { from: 11, to: 20 },
            rect: { x: 40, y: 50, width: 250, height: 28 },
            contentRect: { x: 45, y: 55, width: 240, height: 23 }
          },
          {
            id: "wordTable-0:cell-0-1",
            semanticCellId: "semantic:r0:c1:g1:1",
            originExplicitCellId: "explicit:r0:c1",
            range: { from: 11, to: 20 },
            rect: { x: 290, y: 50, width: 250, height: 28 },
            contentRect: { x: 295, y: 55, width: 240, height: 18 }
          }
        ],
        hitTargets: [
          {
            semanticCellId: "semantic:r0:c0:g1:2",
            originExplicitCellId: "explicit:r0:c0",
            range: { from: 11, to: 20 },
            rect: { x: 40, y: 50, width: 250, height: 28 }
          },
          {
            semanticCellId: "semantic:r0:c1:g1:1",
            originExplicitCellId: "explicit:r0:c1",
            range: { from: 11, to: 20 },
            rect: { x: 290, y: 50, width: 250, height: 28 }
          }
        ]
      },
      {
        id: "wordTable-0:layout#p1",
        range: { from: 21, to: 30 },
        rect: { x: 40, y: 850, width: 500, height: 28 },
        cells: [
          {
            id: "wordTable-0:cell-0-0#p1",
            semanticCellId: "semantic:r0:c0:g1:2",
            originExplicitCellId: "explicit:r0:c0",
            range: { from: 21, to: 30 },
            rect: { x: 40, y: 850, width: 250, height: 28 },
            contentRect: { x: 45, y: 850, width: 240, height: 28 }
          },
          {
            id: "wordTable-0:cell-1-1",
            semanticCellId: "semantic:r1:c1:g1:1",
            originExplicitCellId: "explicit:r1:c1",
            range: { from: 21, to: 30 },
            rect: { x: 290, y: 850, width: 250, height: 28 },
            contentRect: { x: 295, y: 855, width: 240, height: 18 }
          }
        ],
        hitTargets: [
          {
            semanticCellId: "semantic:r0:c0:g1:2",
            originExplicitCellId: "explicit:r0:c0",
            range: { from: 21, to: 30 },
            rect: { x: 40, y: 850, width: 250, height: 28 }
          },
          {
            semanticCellId: "semantic:r1:c1:g1:1",
            originExplicitCellId: "explicit:r1:c1",
            range: { from: 21, to: 30 },
            rect: { x: 290, y: 850, width: 250, height: 28 }
          }
        ]
      }
    ]);
  });

  it("projects vertical merge cell content onto continuation page rows", () => {
    const projected = paginateQuireLayoutDocument({
      document: createDocumentWithCrossPageVerticalMergeTextTable(),
      pageGeometry: createPageGeometry(28)
    });

    expect(
      projected.children.map((box) => ({
        id: box.id,
        range: box.range,
        rect: box.rect,
        children: isTestLayoutContainer(box) ? readProjectedTextChildRanges(box) : []
      }))
    ).toEqual([
      {
        id: "wordTable-0:layout#p0",
        range: { from: 11, to: 20 },
        rect: { x: 40, y: 50, width: 500, height: 28 },
        children: [
          {
            id: "wordTable-0:cell-0-0",
            range: { from: 12, to: 14 },
            rect: { x: 45, y: 55, width: 240, height: 23 },
            text: [
              { text: "Merge L0", y: 55, baseline: 69 }
            ]
          },
          {
            id: "wordTable-0:cell-0-1",
            range: { from: 11, to: 20 },
            rect: { x: 295, y: 55, width: 240, height: 18 },
            text: [
              { text: "B2", y: 55, baseline: 69 }
            ]
          }
        ]
      },
      {
        id: "wordTable-0:layout#p1",
        range: { from: 21, to: 30 },
        rect: { x: 40, y: 850, width: 500, height: 28 },
        children: [
          {
            id: "wordTable-0:cell-0-0#p1",
            range: { from: 14, to: 16 },
            rect: { x: 45, y: 850, width: 240, height: 28 },
            text: [
              { text: "Merge Cut", y: 850, baseline: 864 }
            ]
          },
          {
            id: "wordTable-0:cell-1-1",
            range: { from: 21, to: 30 },
            rect: { x: 295, y: 855, width: 240, height: 18 },
            text: [
              { text: "B3", y: 855, baseline: 869 }
            ]
          }
        ]
      }
    ]);
  });

  it("clips vertical merge body cells to the covered page row band", () => {
    const document = createDocumentWithCrossPageVerticalMergeTable();
    const projected = projectQuireLayoutDocumentToPages({
      document: {
        ...document,
        pages: [{
          pageIndex: 0,
          range: { from: 11, to: 20 },
          pageRect: { x: 0, y: 0, width: 600, height: 800 },
          bodyRect: { x: 40, y: 50, width: 500, height: 100 },
          rect: { x: 40, y: 50, width: 500, height: 100 },
          sourceFlowY: 0,
          sourceFlowHeight: 28,
          endInfo: { openMarks: [], openNodes: [] }
        }]
      }
    });
    const table = projected.children[0]?.table;
    const mergedCell = table?.cells.find((cell) =>
      cell.semanticCellId === "semantic:r0:c0:g1:2"
    );
    const mergedHitTarget = table?.hitTargets.find((target) =>
      target.semanticCellId === "semantic:r0:c0:g1:2"
    );

    expect(table?.rows.map((row) => row.rect)).toEqual([
      { x: 40, y: 50, width: 500, height: 28 }
    ]);
    expect(mergedCell?.rect).toEqual({ x: 40, y: 50, width: 250, height: 28 });
    expect(mergedCell?.contentRect).toEqual({
      x: 45,
      y: 55,
      width: 240,
      height: 23
    });
    expect(mergedHitTarget?.rect).toEqual(mergedCell?.rect);
  });

  it("preserves indented table x coordinates on continuation pages", () => {
    const projected = paginateQuireLayoutDocument({
      document: createDocumentWithIndentedBodyOriginFourRowTable(),
      pageGeometry: createPageGeometry(56)
    });

    expect(
      projected.children.map((box) => ({
        rect: box.rect,
        tableRect: box.table?.rect,
        rowRects: box.table?.rows.map((row) => row.rect),
        cellRects: box.table?.cells.map((cell) => cell.rect)
      }))
    ).toEqual([
      {
        rect: { x: 88, y: 50, width: 500, height: 56 },
        tableRect: { x: 88, y: 50, width: 500, height: 56 },
        rowRects: [
          { x: 88, y: 50, width: 500, height: 28 },
          { x: 88, y: 78, width: 500, height: 28 }
        ],
        cellRects: [
          { x: 88, y: 50, width: 500, height: 28 },
          { x: 88, y: 78, width: 500, height: 28 }
        ]
      },
      {
        rect: { x: 88, y: 850, width: 500, height: 56 },
        tableRect: { x: 88, y: 850, width: 500, height: 56 },
        rowRects: [
          { x: 88, y: 850, width: 500, height: 28 },
          { x: 88, y: 878, width: 500, height: 28 }
        ],
        cellRects: [
          { x: 88, y: 850, width: 500, height: 28 },
          { x: 88, y: 878, width: 500, height: 28 }
        ]
      }
    ]);
  });

  it("does not leak indented continuation table projection to following blocks", () => {
    const projected = paginateQuireLayoutDocument({
      document: createDocumentWithIndentedBodyOriginTableAndFollowingBlock(),
      pageGeometry: createPageGeometry(90)
    });

    expect(
      projected.children.map((box) => ({
        id: box.id,
        rect: box.rect,
        tableRect: box.table?.rect,
        rowRects: box.table?.rows.map((row) => row.rect)
      }))
    ).toEqual([
      {
        id: "wordTable-0:layout#p0",
        rect: { x: 88, y: 50, width: 500, height: 84 },
        tableRect: { x: 88, y: 50, width: 500, height: 84 },
        rowRects: [
          { x: 88, y: 50, width: 500, height: 28 },
          { x: 88, y: 78, width: 500, height: 28 },
          { x: 88, y: 106, width: 500, height: 28 }
        ]
      },
      {
        id: "wordTable-0:layout#p1",
        rect: { x: 88, y: 850, width: 500, height: 28 },
        tableRect: { x: 88, y: 850, width: 500, height: 28 },
        rowRects: [
          { x: 88, y: 850, width: 500, height: 28 }
        ]
      },
      {
        id: "after-table",
        rect: { x: 40, y: 886, width: 500, height: 24 },
        tableRect: undefined,
        rowRects: undefined
      }
    ]);
  });

  it("repeats table header rows as visual continuation fragments", () => {
    const projected = paginateQuireLayoutDocument({
      document: createDocumentWithRepeatedHeaderTable(),
      pageGeometry: createPageGeometry(56)
    });

    expect(projected.pages.map((page) => ({
      range: page.range,
      rect: page.rect
    }))).toEqual([
      { range: { from: 11, to: 30 }, rect: { x: 40, y: 50, width: 500, height: 56 } },
      { range: { from: 31, to: 40 }, rect: { x: 40, y: 850, width: 500, height: 56 } },
      { range: { from: 41, to: 50 }, rect: { x: 40, y: 1650, width: 500, height: 56 } }
    ]);
    expect(
      projected.children.map((box) => ({
        id: box.id,
        range: box.range,
        rect: box.rect,
        rows: box.table?.rows.map((row) => ({
          id: row.id,
          range: row.range,
          rowIndex: row.rowIndex,
          isRepeatedHeader: row.isRepeatedHeader === true,
          rect: row.rect
        })),
        cells: box.table?.cells.map((cell) => ({
          id: cell.id,
          range: cell.range,
          semanticCellId: cell.semanticCellId,
          isRepeatedHeader: cell.isRepeatedHeader === true,
          rect: cell.rect,
          contentRect: cell.contentRect
        })),
        children: isTestLayoutContainer(box) ? readProjectedChildRanges(box) : []
      }))
    ).toEqual([
      {
        id: "wordTable-0:layout#p0",
        range: { from: 11, to: 30 },
        rect: { x: 40, y: 50, width: 500, height: 56 },
        rows: [
          {
            id: "wordTable-0:row-0",
            range: { from: 11, to: 20 },
            rowIndex: 0,
            isRepeatedHeader: false,
            rect: { x: 40, y: 50, width: 500, height: 28 }
          },
          {
            id: "wordTable-0:row-1",
            range: { from: 21, to: 30 },
            rowIndex: 1,
            isRepeatedHeader: false,
            rect: { x: 40, y: 78, width: 500, height: 28 }
          }
        ],
        cells: [
          {
            id: "wordTable-0:cell-0-0",
            range: { from: 11, to: 20 },
            semanticCellId: "semantic:r0:c0:g1:1",
            isRepeatedHeader: false,
            rect: { x: 40, y: 50, width: 500, height: 28 },
            contentRect: { x: 45, y: 55, width: 490, height: 18 }
          },
          {
            id: "wordTable-0:cell-1-0",
            range: { from: 21, to: 30 },
            semanticCellId: "semantic:r1:c0:g1:1",
            isRepeatedHeader: false,
            rect: { x: 40, y: 78, width: 500, height: 28 },
            contentRect: { x: 45, y: 83, width: 490, height: 18 }
          }
        ],
        children: [
          {
            id: "wordTable-0:cell-0-0",
            range: { from: 11, to: 20 },
            rect: { x: 45, y: 55, width: 490, height: 18 },
            text: ["Header"]
          },
          {
            id: "wordTable-0:cell-1-0",
            range: { from: 21, to: 30 },
            rect: { x: 45, y: 83, width: 490, height: 18 },
            text: ["Body 1"]
          }
        ]
      },
      {
        id: "wordTable-0:layout#p1",
        range: { from: 31, to: 40 },
        rect: { x: 40, y: 850, width: 500, height: 56 },
        rows: [
          {
            id: "wordTable-0:row-0:repeat-p1",
            range: { from: 11, to: 20 },
            rowIndex: 0,
            isRepeatedHeader: true,
            rect: { x: 40, y: 850, width: 500, height: 28 }
          },
          {
            id: "wordTable-0:row-2",
            range: { from: 31, to: 40 },
            rowIndex: 2,
            isRepeatedHeader: false,
            rect: { x: 40, y: 878, width: 500, height: 28 }
          }
        ],
        cells: [
          {
            id: "wordTable-0:cell-0-0:repeat-p1",
            range: { from: 11, to: 20 },
            semanticCellId: "semantic:r0:c0:g1:1",
            isRepeatedHeader: true,
            rect: { x: 40, y: 850, width: 500, height: 28 },
            contentRect: { x: 45, y: 855, width: 490, height: 18 }
          },
          {
            id: "wordTable-0:cell-2-0",
            range: { from: 31, to: 40 },
            semanticCellId: "semantic:r2:c0:g1:1",
            isRepeatedHeader: false,
            rect: { x: 40, y: 878, width: 500, height: 28 },
            contentRect: { x: 45, y: 883, width: 490, height: 18 }
          }
        ],
        children: [
          {
            id: "wordTable-0:cell-0-0:repeat-p1",
            range: { from: 11, to: 20 },
            rect: { x: 45, y: 855, width: 490, height: 18 },
            text: ["Header"]
          },
          {
            id: "wordTable-0:cell-2-0",
            range: { from: 31, to: 40 },
            rect: { x: 45, y: 883, width: 490, height: 18 },
            text: ["Body 2"]
          }
        ]
      },
      {
        id: "wordTable-0:layout#p2",
        range: { from: 41, to: 50 },
        rect: { x: 40, y: 1650, width: 500, height: 56 },
        rows: [
          {
            id: "wordTable-0:row-0:repeat-p2",
            range: { from: 11, to: 20 },
            rowIndex: 0,
            isRepeatedHeader: true,
            rect: { x: 40, y: 1650, width: 500, height: 28 }
          },
          {
            id: "wordTable-0:row-3",
            range: { from: 41, to: 50 },
            rowIndex: 3,
            isRepeatedHeader: false,
            rect: { x: 40, y: 1678, width: 500, height: 28 }
          }
        ],
        cells: [
          {
            id: "wordTable-0:cell-0-0:repeat-p2",
            range: { from: 11, to: 20 },
            semanticCellId: "semantic:r0:c0:g1:1",
            isRepeatedHeader: true,
            rect: { x: 40, y: 1650, width: 500, height: 28 },
            contentRect: { x: 45, y: 1655, width: 490, height: 18 }
          },
          {
            id: "wordTable-0:cell-3-0",
            range: { from: 41, to: 50 },
            semanticCellId: "semantic:r3:c0:g1:1",
            isRepeatedHeader: false,
            rect: { x: 40, y: 1678, width: 500, height: 28 },
            contentRect: { x: 45, y: 1683, width: 490, height: 18 }
          }
        ],
        children: [
          {
            id: "wordTable-0:cell-0-0:repeat-p2",
            range: { from: 11, to: 20 },
            rect: { x: 45, y: 1655, width: 490, height: 18 },
            text: ["Header"]
          },
          {
            id: "wordTable-0:cell-3-0",
            range: { from: 41, to: 50 },
            rect: { x: 45, y: 1683, width: 490, height: 18 },
            text: ["Body 3"]
          }
        ]
      }
    ]);
  });

  it("splits an oversized table cell into page-local row and cell fragments", () => {
    const projected = paginateQuireLayoutDocument({
      document: createDocumentWithOversizedTableCell(),
      pageGeometry: createPageGeometry(48)
    });

    expect(projected.pages.map((page) => page.range)).toEqual([
      { from: 11, to: 20 },
      { from: 20, to: 50 }
    ]);
    expect(
      projected.children.map((box) => ({
        id: box.id,
        range: box.range,
        rect: box.rect,
        fragmentId: box.table?.fragmentId,
        rows: box.table?.rows.map((row) => ({
          id: row.id,
          range: row.range,
          rect: row.rect
        })),
        cells: box.table?.cells.map((cell) => ({
          id: cell.id,
          semanticCellId: cell.semanticCellId,
          range: cell.range,
          rect: cell.rect,
          contentRect: cell.contentRect
        })),
        childRanges: isTestLayoutContainer(box) ? readProjectedChildRanges(box) : []
      }))
    ).toEqual([
      {
        id: "wordTable-0:layout#p0",
        range: { from: 11, to: 20 },
        rect: { x: 40, y: 50, width: 500, height: 48 },
        fragmentId: "wordTable-0#p0",
        rows: [
          {
            id: "wordTable-0:row-0#p0",
            range: { from: 11, to: 20 },
            rect: { x: 40, y: 50, width: 500, height: 48 }
          }
        ],
        cells: [
          {
            id: "wordTable-0:cell-0-0#p0",
            semanticCellId: "semantic:r0:c0:g1:1",
            range: { from: 11, to: 20 },
            rect: { x: 40, y: 50, width: 250, height: 48 },
            contentRect: { x: 45, y: 50, width: 240, height: 48 }
          },
          {
            id: "wordTable-0:cell-0-1#p0",
            semanticCellId: "semantic:r0:c1:g1:1",
            range: { from: 11, to: 20 },
            rect: { x: 290, y: 50, width: 250, height: 48 },
            contentRect: { x: 295, y: 50, width: 240, height: 48 }
          }
        ],
        childRanges: [
          {
            id: "wordTable-0:cell-0-1#p0",
            range: { from: 12, to: 20 },
            rect: { x: 295, y: 50, width: 240, height: 48 },
            text: ["L0", "L1"]
          }
        ]
      },
      {
        id: "wordTable-0:layout#p1",
        range: { from: 20, to: 50 },
        rect: { x: 40, y: 850, width: 500, height: 48 },
        fragmentId: "wordTable-0#p1",
        rows: [
          {
            id: "wordTable-0:row-0#p1",
            range: { from: 20, to: 50 },
            rect: { x: 40, y: 850, width: 500, height: 48 }
          }
        ],
        cells: [
          {
            id: "wordTable-0:cell-0-0#p1",
            semanticCellId: "semantic:r0:c0:g1:1",
            range: { from: 20, to: 50 },
            rect: { x: 40, y: 850, width: 250, height: 48 },
            contentRect: { x: 45, y: 850, width: 240, height: 48 }
          },
          {
            id: "wordTable-0:cell-0-1#p1",
            semanticCellId: "semantic:r0:c1:g1:1",
            range: { from: 20, to: 50 },
            rect: { x: 290, y: 850, width: 250, height: 48 },
            contentRect: { x: 295, y: 850, width: 240, height: 48 }
          }
        ],
        childRanges: [
          {
            id: "wordTable-0:cell-0-1#p1",
            range: { from: 20, to: 28 },
            rect: { x: 295, y: 850, width: 240, height: 48 },
            text: ["L2", "L3"]
          }
        ]
      }
    ]);
  });

  it("splits nested block containers inside table cells across page fragments", () => {
    const projected = paginateQuireLayoutDocument({
      document: createDocumentWithNestedOversizedTableCell(),
      pageGeometry: createPageGeometry(48)
    });

    expect(projected.pages.map((page) => page.range)).toEqual([
      { from: 11, to: 20 },
      { from: 20, to: 50 }
    ]);
    expect(
      projected.children.map((box) => ({
        id: box.id,
        range: box.range,
        rect: box.rect,
        nested: isTestLayoutContainer(box) ? readProjectedNestedChildRanges(box) : []
      }))
    ).toEqual([
      {
        id: "wordTable-0:layout#p0",
        range: { from: 11, to: 20 },
        rect: { x: 40, y: 50, width: 500, height: 48 },
        nested: [
          {
            id: "wordTable-0:cell-0-1#p0",
            range: { from: 12, to: 20 },
            rect: { x: 295, y: 50, width: 240, height: 48 },
            children: [
              {
                id: "wordTable-0:cell-0-1:nested#p0",
                range: { from: 12, to: 20 },
                rect: { x: 295, y: 50, width: 120, height: 48 },
                text: ["L0", "L1"]
              }
            ]
          }
        ]
      },
      {
        id: "wordTable-0:layout#p1",
        range: { from: 20, to: 50 },
        rect: { x: 40, y: 850, width: 500, height: 48 },
        nested: [
          {
            id: "wordTable-0:cell-0-1#p1",
            range: { from: 20, to: 28 },
            rect: { x: 295, y: 850, width: 240, height: 48 },
            children: [
              {
                id: "wordTable-0:cell-0-1:nested#p1",
                range: { from: 20, to: 28 },
                rect: { x: 295, y: 850, width: 120, height: 48 },
                text: ["L2", "L3"]
              }
            ]
          }
        ]
      }
    ]);
  });
});

/**
 * Creates a paginated document whose first box is a table anchored to page 1.
 *
 * @returns Layout document with table metadata still in infinite-flow coordinates.
 */
function createDocumentWithTableOnSecondPage(): QuireLayoutDocument {
  const tableRange = { from: 20, to: 40 };
  const tableRect = { x: 0, y: 48, width: 500, height: 68 };
  const cell: QuireTableCellFragment = {
    id: "wordTable-0:cell-0-0",
    semanticCellId: "semantic:r0:c0:g1:1",
    originExplicitCellId: "explicit:r0:c0",
    explicitCellIds: ["explicit:r0:c0"],
    originCellPos: 23,
    range: { from: 23, to: 27 },
    shading: null,
    backgroundColor: null,
    borders: null,
    cellMargins: null,
    preferredWidth: null,
    gridRect: { startRow: 0, startColumn: 0, rowSpan: 1, columnSpan: 1 },
    rect: { x: 0, y: 48, width: 250, height: 34 },
    contentRect: { x: 5, y: 53, width: 240, height: 24 },
    contentChildren: []
  };
  const cellBox = createTableCellBox(cell, []);
  const tableBox: QuireLayoutContainer = {
    id: "wordTable-0:layout",
    range: tableRange,
    rect: tableRect,
    table: {
      tableId: "wordTable-0",
      fragmentId: "wordTable-0",
      geometryId: "wordTable-0",
      tableRange,
      style: {
        backgroundColor: null,
        borderColor: "#cbd5e1",
        borderWidth: 1
      },
      borders: null,
      rect: tableRect,
      tracks: [
        { id: "wordTable-0:col-0", columnIndex: 0, x: 0, width: 250 },
        { id: "wordTable-0:col-1", columnIndex: 1, x: 250, width: 250 }
      ],
      rows: [
          {
            id: "wordTable-0:row-0",
            sourceRowId: "row-0",
            rowIndex: 0,
            isHeader: false,
            cantSplit: false,
            range: { from: 23, to: 27 },
            rect: { x: 0, y: 48, width: 500, height: 34 }
          },
        {
            id: "wordTable-0:row-1",
            sourceRowId: "row-1",
            rowIndex: 1,
            isHeader: false,
            cantSplit: false,
            range: { from: 28, to: 35 },
            rect: { x: 0, y: 82, width: 500, height: 34 }
          }
      ],
      cells: [cell],
      hitTargets: [
        {
          id: "wordTable-0:hit:semantic:r0:c0:g1:1",
          kind: "cell",
          tableId: "wordTable-0",
          semanticCellId: "semantic:r0:c0:g1:1",
          originExplicitCellId: "explicit:r0:c0",
          explicitCellIds: ["explicit:r0:c0"],
          originCellPos: 23,
          range: { from: 23, to: 27 },
          rect: { x: 0, y: 48, width: 250, height: 34 }
        }
      ]
    },
    children: [cellBox]
  };

  return {
    id: "doc",
    range: tableRange,
    rect: { x: 0, y: 0, width: 500, height: 116 },
    children: [tableBox],
    anchors: [],
    anchorOccurrenceGaps: [],
    anchorRegionProducts: createEmptyAnchorRegionProducts(),
    anchorPlacementGaps: [],
    hitTargets: [],
    pages: [
      {
        pageIndex: 1,
        range: tableRange,
        pageRect: { x: 0, y: 800, width: 600, height: 800 },
        bodyRect: { x: 40, y: 850, width: 500, height: 700 },
        rect: { x: 40, y: 850, width: 500, height: 68 },
        sourceFlowY: 48,
        sourceFlowHeight: 68,
        endInfo: { openMarks: [], openNodes: [] }
      }
    ]
  };
}

/**
 * Creates a two-page document where the active clip should keep only page two.
 *
 * @returns Layout document with one block per page in source-flow coordinates.
 */
function createDocumentWithTwoClippedPages(): QuireLayoutDocument {
  return {
    id: "doc",
    range: { from: 1, to: 20 },
    rect: { x: 0, y: 0, width: 200, height: 60 },
    children: [
      {
        id: "offscreen",
        range: { from: 1, to: 10 },
        rect: { x: 0, y: 0, width: 200, height: 20 }
      },
      {
        id: "visible",
        range: { from: 11, to: 20 },
        rect: { x: 0, y: 40, width: 200, height: 20 }
      }
    ],
    anchors: [],
    anchorOccurrenceGaps: [],
    anchorRegionProducts: createEmptyAnchorRegionProducts(),
    anchorPlacementGaps: [],
    hitTargets: [],
    pages: [
      {
        pageIndex: 0,
        range: { from: 1, to: 10 },
        pageRect: { x: 0, y: 0, width: 600, height: 800 },
        bodyRect: { x: 40, y: 50, width: 500, height: 700 },
        rect: { x: 40, y: 50, width: 500, height: 20 },
        sourceFlowY: 0,
        sourceFlowHeight: 20,
        endInfo: { openMarks: [], openNodes: [] }
      },
      {
        pageIndex: 1,
        range: { from: 11, to: 20 },
        pageRect: { x: 0, y: 800, width: 600, height: 800 },
        bodyRect: { x: 40, y: 850, width: 500, height: 700 },
        rect: { x: 40, y: 850, width: 500, height: 20 },
        sourceFlowY: 40,
        sourceFlowHeight: 20,
        endInfo: { openMarks: [], openNodes: [] }
      }
    ]
  };
}

/**
 * Creates nested paragraphs whose source-flow and page coordinates deliberately collide.
 *
 * @param ordered - Whether text arrays advertise measured line ordering.
 * @returns Two-page source document with an off-window nested paragraph.
 */
function createNestedWindowProjectionDocument(ordered: boolean): QuireLayoutDocument {
  const visible = createWindowProjectionTextLeaf("visible", 10, 100, ordered);
  const outside = createWindowProjectionTextLeaf("outside", 40, 410, ordered);
  const range = { from: 0, to: 100 };
  const rect = { x: 10, y: 0, width: 200, height: 500 };
  const nestedSection: QuireLayoutContainer = {
    id: "nested-section",
    range: outside.range,
    rect: outside.rect,
    children: [outside]
  };
  const section: QuireLayoutContainer = {
    id: "section",
    range,
    rect,
    children: [visible, nestedSection]
  };

  return {
    id: "doc",
    range,
    rect,
    children: [section],
    anchors: [],
    anchorOccurrenceGaps: [],
    anchorRegionProducts: createEmptyAnchorRegionProducts(),
    anchorPlacementGaps: [],
    hitTargets: [],
    pages: [
      createWindowProjectionPage(1, 10, 30, 100, 400),
      createWindowProjectionPage(3, 40, 60, 400, 1000)
    ]
  };
}

/**
 * Creates a measured paragraph with caret geometry in infinite-flow coordinates.
 *
 * @param id - Stable paragraph identity.
 * @param from - Paragraph source-range start.
 * @param y - Source-flow line top.
 * @param ordered - Whether to mark the fragment array as ordered.
 * @returns Paragraph leaf with one text fragment.
 */
function createWindowProjectionTextLeaf(
  id: string,
  from: number,
  y: number,
  ordered: boolean
): QuireLayoutBox {
  const rect = { x: 10, y, width: 100, height: 20 };
  const fragments = [{
    id: `${id}:line`,
    text: id,
    range: { from: from + 1, to: from + 9 },
    rect,
    font: "12px serif",
    lineHeight: 20,
    baseline: y + 15,
    caretStops: [
      { position: { pos: from + 1, bias: 1 as const }, localX: 0 },
      { position: { pos: from + 9, bias: -1 as const }, localX: 100 }
    ]
  }];

  return {
    id,
    range: { from, to: from + 10 },
    rect,
    textFragments: ordered ? markQuireTextFragmentsSortedByLineTop(fragments) : fragments
  };
}

/**
 * Creates a page with explicitly separate source-flow and document-page coordinates.
 *
 * @param pageIndex - Stable document page index.
 * @param from - First source position owned by the page.
 * @param to - Last source position owned by the page.
 * @param sourceY - Accepted source-flow band top.
 * @param visualY - Document-space page top.
 * @returns Measured page geometry consumed by the public projector.
 */
function createWindowProjectionPage(
  pageIndex: number,
  from: number,
  to: number,
  sourceY: number,
  visualY: number
): QuireLayoutDocument["pages"][number] {
  const bodyRect = { x: 10, y: visualY + 10, width: 200, height: 100 };
  return {
    pageIndex,
    range: { from, to },
    sourceFlowY: sourceY,
    sourceFlowHeight: 100,
    pageRect: { x: 0, y: visualY, width: 300, height: 200 },
    bodyRect,
    rect: bodyRect,
    endInfo: { openMarks: [], openNodes: [] }
  };
}

/**
 * Collects actual projected text leaves without reconstructing projection geometry.
 *
 * @param box - Source or projected layout subtree.
 * @returns Leaves retaining fragment identity, range, baseline and caret geometry.
 */
function collectProjectionTextLeaves(box: QuireLayoutBox): readonly QuireLayoutBox[] {
  if (isTestLayoutContainer(box)) {
    return box.children.flatMap((child) => collectProjectionTextLeaves(child));
  }

  return box.textFragments === undefined ? [] : [box];
}

/**
 * Creates a four-row table whose rows should split evenly across two pages.
 *
 * @returns Layout document with table row and cell metadata in flow coordinates.
 */
function createDocumentWithFourRowTable(): QuireLayoutDocument {
  const tableRange = { from: 10, to: 60 };
  const rows = Array.from({ length: 4 }, (_, rowIndex) =>
    createRowFixture(rowIndex, tableRange)
  );
  const tableRect = { x: 0, y: 0, width: 500, height: 112 };
  const tableBox = {
    id: "wordTable-0:layout",
    range: tableRange,
    rect: tableRect,
    table: {
      tableId: "wordTable-0",
      fragmentId: "wordTable-0",
      geometryId: "wordTable-0",
      tableRange,
      style: {
        backgroundColor: null,
        borderColor: "#cbd5e1",
        borderWidth: 1
      },
      borders: null,
      rect: tableRect,
      tracks: [{ id: "wordTable-0:col-0", columnIndex: 0, x: 0, width: 500 }],
      rows: rows.map((row) => row.row),
      cells: rows.map((row) => row.cell),
      hitTargets: rows.map((row) => row.hitTarget)
    },
    children: rows.map((row) => createTableCellBox(row.cell, []))
  } as unknown as QuireLayoutContainer;

  return {
    id: "doc",
    range: tableRange,
    rect: tableRect,
    children: [tableBox],
    anchors: [],
    anchorOccurrenceGaps: [],
    anchorRegionProducts: createEmptyAnchorRegionProducts(),
    anchorPlacementGaps: [],
    hitTargets: [],
    pages: []
  };
}

/**
 * Creates a four-row table whose source geometry starts after a table indent.
 *
 * @returns Layout document with indented table row and cell metadata.
 */
function createDocumentWithIndentedFourRowTable(): QuireLayoutDocument {
  return translateDocumentTableX(createDocumentWithFourRowTable(), 48);
}

/**
 * Creates an indented table in a flow whose origin already matches the body left.
 *
 * @returns Layout document with body-origin and table-indent horizontal offsets.
 */
function createDocumentWithIndentedBodyOriginFourRowTable(): QuireLayoutDocument {
  return translateDocumentFlowX(createDocumentWithIndentedFourRowTable(), 40);
}

/**
 * Creates an indented cross-page table followed by an ordinary body block.
 *
 * @returns Layout document where only the table owns the horizontal indent.
 */
function createDocumentWithIndentedBodyOriginTableAndFollowingBlock(): QuireLayoutDocument {
  const document = createDocumentWithIndentedBodyOriginFourRowTable();
  const followingBlock: QuireLayoutBox = {
    id: "after-table",
    range: { from: 61, to: 70 },
    rect: { x: 40, y: 120, width: 500, height: 24 }
  };

  return {
    ...document,
    range: { from: document.range.from, to: followingBlock.range.to },
    rect: { x: 40, y: 0, width: 548, height: 144 },
    children: [
      ...document.children,
      followingBlock
    ]
  };
}

/**
 * Creates a two-row table whose left semantic cell vertically spans a page cut.
 *
 * @returns Layout document with a cross-page vertical merge fixture.
 */
function createDocumentWithCrossPageVerticalMergeTable(): QuireLayoutDocument {
  const tableRange = { from: 10, to: 40 };
  const rows = [
    createVerticalMergeRowFixture(0, { from: 11, to: 20 }),
    createVerticalMergeRowFixture(1, { from: 21, to: 30 })
  ];
  const mergedCell = createVerticalMergeCellFixture({
    id: "wordTable-0:cell-0-0",
    semanticCellId: "semantic:r0:c0:g1:2",
    originExplicitCellId: "explicit:r0:c0",
    explicitCellIds: ["explicit:r0:c0", "explicit:r1:c0"],
    range: rows[0]?.range ?? { from: 11, to: 20 },
    rect: { x: 0, y: 0, width: 250, height: 56 },
    contentRect: { x: 5, y: 5, width: 240, height: 51 },
    startRow: 0,
    startColumn: 0,
    rowSpan: 2
  });
  const topRightCell = createVerticalMergeCellFixture({
    id: "wordTable-0:cell-0-1",
    semanticCellId: "semantic:r0:c1:g1:1",
    originExplicitCellId: "explicit:r0:c1",
    explicitCellIds: ["explicit:r0:c1"],
    range: rows[0]?.range ?? { from: 11, to: 20 },
    rect: { x: 250, y: 0, width: 250, height: 28 },
    contentRect: { x: 255, y: 5, width: 240, height: 18 },
    startRow: 0,
    startColumn: 1,
    rowSpan: 1
  });
  const bottomRightCell = createVerticalMergeCellFixture({
    id: "wordTable-0:cell-1-1",
    semanticCellId: "semantic:r1:c1:g1:1",
    originExplicitCellId: "explicit:r1:c1",
    explicitCellIds: ["explicit:r1:c1"],
    range: rows[1]?.range ?? { from: 21, to: 30 },
    rect: { x: 250, y: 28, width: 250, height: 28 },
    contentRect: { x: 255, y: 33, width: 240, height: 18 },
    startRow: 1,
    startColumn: 1,
    rowSpan: 1
  });
  const cells = [mergedCell, topRightCell, bottomRightCell];
  const tableRect = { x: 0, y: 0, width: 500, height: 56 };
  const tableBox: QuireLayoutContainer = {
    id: "wordTable-0:layout",
    range: tableRange,
    rect: tableRect,
    table: {
      tableId: "wordTable-0",
      fragmentId: "wordTable-0",
      geometryId: "wordTable-0",
      tableRange,
      style: {
        backgroundColor: null,
        borderColor: "#cbd5e1",
        borderWidth: 1
      },
      borders: null,
      rect: tableRect,
      tracks: [
        { id: "wordTable-0:col-0", columnIndex: 0, x: 0, width: 250 },
        { id: "wordTable-0:col-1", columnIndex: 1, x: 250, width: 250 }
      ],
      rows,
      cells,
      hitTargets: cells.map((cell) => ({
        id: `wordTable-0:hit:${cell.semanticCellId}`,
        kind: "cell",
        tableId: "wordTable-0",
        semanticCellId: cell.semanticCellId,
        originExplicitCellId: cell.originExplicitCellId,
        explicitCellIds: cell.explicitCellIds,
        originCellPos: cell.originCellPos,
        range: cell.range,
        rect: cell.rect
      }))
    },
    children: cells.map((cell) => createTableCellBox(cell, []))
  };

  return {
    id: "doc",
    range: tableRange,
    rect: tableRect,
    children: [tableBox],
    anchors: [],
    anchorOccurrenceGaps: [],
    anchorRegionProducts: createEmptyAnchorRegionProducts(),
    anchorPlacementGaps: [],
    hitTargets: [],
    pages: []
  };
}

/**
 * Creates a two-row vMerge table whose origin cell text visually continues into the second row.
 *
 * @returns Layout document with page-splitting vMerge cell content.
 */
function createDocumentWithCrossPageVerticalMergeTextTable(): QuireLayoutDocument {
  const document = createDocumentWithCrossPageVerticalMergeTable();
  const tableBox = document.children[0];

  if (tableBox === undefined || !isTestLayoutContainer(tableBox) || !tableBox.table) {
    return document;
  }

  const cellsById = new Map(tableBox.table.cells.map((cell) => [cell.id, cell]));
  const mergedCell = cellsById.get("wordTable-0:cell-0-0");
  const topRightCell = cellsById.get("wordTable-0:cell-0-1");
  const bottomRightCell = cellsById.get("wordTable-0:cell-1-1");

  if (
    mergedCell === undefined ||
    topRightCell === undefined ||
    bottomRightCell === undefined
  ) {
    return document;
  }

  const mergedParagraph: QuireLayoutContainer = {
    id: `${mergedCell.id}:paragraph`,
    range: { from: 12, to: 16 },
    rect: mergedCell.contentRect,
    textFragments: [
      createTextFragmentFixture({
        id: "merge-l0",
        text: "Merge L0",
        range: { from: 12, to: 14 },
        rect: { x: 5, y: 5, width: 120, height: 18 },
        lineHeight: 18
      }),
      createTextFragmentFixture({
        id: "merge-l1",
        text: "Merge Cut",
        range: { from: 14, to: 16 },
        rect: { x: 5, y: 23, width: 120, height: 18 },
        lineHeight: 18
      })
    ],
    children: []
  };
  const mergedContent = createTableCellBox(mergedCell, [mergedParagraph]);
  const tableWithText: QuireLayoutContainer = {
    ...tableBox,
    children: [
      mergedContent,
      createTextCellContentFixture(topRightCell, "B2"),
      createTextCellContentFixture(bottomRightCell, "B3")
    ]
  };

  return {
    ...document,
    children: [tableWithText]
  };
}

/**
 * Creates one row fragment for the cross-page vertical merge fixture.
 *
 * @param rowIndex - Source row index.
 * @param range - Document range owned by the row.
 * @returns Row fragment in flow coordinates.
 */
function createVerticalMergeRowFixture(
  rowIndex: number,
  range: { readonly from: number; readonly to: number }
) {
  return {
    id: `wordTable-0:row-${rowIndex}`,
    sourceRowId: `row:r${rowIndex}`,
    rowIndex,
    isHeader: false,
    cantSplit: false,
    range,
    rect: { x: 0, y: rowIndex * 28, width: 500, height: 28 }
  };
}

/**
 * Creates one cell fragment for the cross-page vertical merge fixture.
 *
 * @param options - Cell identity, range, and geometry.
 * @returns Cell fragment in flow coordinates.
 */
function createVerticalMergeCellFixture(options: {
  readonly id: string;
  readonly semanticCellId: string;
  readonly originExplicitCellId: string;
  readonly explicitCellIds: readonly string[];
  readonly range: { readonly from: number; readonly to: number };
  readonly rect: { readonly x: number; readonly y: number; readonly width: number; readonly height: number };
  readonly contentRect: { readonly x: number; readonly y: number; readonly width: number; readonly height: number };
  readonly startRow: number;
  readonly startColumn: number;
  readonly rowSpan: number;
}): QuireTableCellFragment {
  return {
    id: options.id,
    semanticCellId: options.semanticCellId,
    originExplicitCellId: options.originExplicitCellId,
    explicitCellIds: options.explicitCellIds,
    originCellPos: options.range.from,
    range: options.range,
    shading: null,
    backgroundColor: null,
    borders: null,
    cellMargins: null,
    preferredWidth: null,
    gridRect: {
      startRow: options.startRow,
      startColumn: options.startColumn,
      rowSpan: options.rowSpan,
      columnSpan: 1
    },
    rect: options.rect,
    contentRect: options.contentRect,
    contentChildren: []
  };
}

/**
 * Translates the whole fixture flow horizontally.
 *
 * @param document - Source fixture document.
 * @param dx - Horizontal offset applied to the body flow.
 * @returns Fixture document with every owned rectangle translated.
 */
function translateDocumentFlowX(
  document: QuireLayoutDocument,
  dx: number
): QuireLayoutDocument {
  return {
    ...document,
    rect: translateRectX(document.rect, dx),
    children: document.children.map((child) => translateLayoutBoxX(child, dx))
  };
}

/**
 * Translates one layout box tree horizontally.
 *
 * @param box - Source layout box.
 * @param dx - Horizontal offset.
 * @returns Layout box with owned geometry translated.
 */
function translateLayoutBoxX(box: QuireLayoutBox, dx: number): QuireLayoutBox {
  const table = box.table === undefined
    ? undefined
    : {
        ...box.table,
        rect: translateRectX(box.table.rect, dx),
        tracks: box.table.tracks.map((track) => ({
          ...track,
          x: track.x + dx
        })),
        rows: box.table.rows.map((row) => ({
          ...row,
          rect: translateRectX(row.rect, dx)
        })),
        cells: box.table.cells.map((cell) => ({
          ...cell,
          rect: translateRectX(cell.rect, dx),
          contentRect: translateRectX(cell.contentRect, dx),
          ...(cell.contentLayoutRect === undefined
            ? {}
            : { contentLayoutRect: translateRectX(cell.contentLayoutRect, dx) })
        })),
        hitTargets: box.table.hitTargets.map((target) => ({
          ...target,
          rect: translateRectX(target.rect, dx)
        }))
      };

  if (isTestLayoutContainer(box)) {
    const translated: QuireLayoutContainer = {
      ...box,
      rect: translateRectX(box.rect, dx),
      ...(table === undefined ? {} : { table }),
      children: box.children.map((child) => translateLayoutBoxX(child, dx))
    };

    return translated;
  }

  return {
    ...box,
    rect: translateRectX(box.rect, dx),
    ...(table === undefined ? {} : { table })
  };
}

/**
 * Translates every table-owned x coordinate in a fixture document.
 *
 * @param document - Source table fixture document.
 * @param dx - Horizontal offset applied to table geometry.
 * @returns Fixture document with table geometry translated in flow space.
 */
function translateDocumentTableX(
  document: QuireLayoutDocument,
  dx: number
): QuireLayoutDocument {
  const tableBox = document.children[0];

  if (tableBox === undefined || !isTestLayoutContainer(tableBox) || !tableBox.table) {
    return document;
  }

  const table = tableBox.table;
  const shiftedTableBox: QuireLayoutContainer = {
    ...tableBox,
    rect: translateRectX(tableBox.rect, dx),
    table: {
      ...table,
      rect: translateRectX(table.rect, dx),
      tracks: table.tracks.map((track) => ({
        ...track,
        x: track.x + dx
      })),
      rows: table.rows.map((row) => ({
        ...row,
        rect: translateRectX(row.rect, dx)
      })),
      cells: table.cells.map((cell) => ({
        ...cell,
        rect: translateRectX(cell.rect, dx),
        contentRect: translateRectX(cell.contentRect, dx),
        ...(cell.contentLayoutRect === undefined
          ? {}
          : { contentLayoutRect: translateRectX(cell.contentLayoutRect, dx) })
      })),
      hitTargets: table.hitTargets.map((target) => ({
        ...target,
        rect: translateRectX(target.rect, dx)
      }))
    },
    children: tableBox.children.map((child) => ({
      ...child,
      rect: translateRectX(child.rect, dx)
    }))
  };

  return {
    ...document,
    rect: {
      ...document.rect,
      width: document.rect.width + dx
    },
    children: [shiftedTableBox]
  };
}

/**
 * Translates one rectangle horizontally.
 *
 * @param rect - Rectangle to translate.
 * @param dx - Horizontal offset.
 * @returns Translated rectangle.
 */
function translateRectX<T extends { readonly x: number }>(rect: T, dx: number): T {
  return {
    ...rect,
    x: rect.x + dx
  };
}

/**
 * Creates a four-row table whose first row repeats on continuation pages.
 *
 * @returns Layout document with header metadata and visible cell text fixtures.
 */
function createDocumentWithRepeatedHeaderTable(): QuireLayoutDocument {
  const document = createDocumentWithFourRowTable();
  const tableBox = document.children[0];

  if (tableBox === undefined || !isTestLayoutContainer(tableBox) || !tableBox.table) {
    return document;
  }

  const table = tableBox.table;
  const rows = table.rows.map((row) => ({
    ...row,
    isHeader: row.rowIndex === 0
  }));
  const cells = table.cells;
  const tableWithHeader: QuireLayoutContainer = {
    ...tableBox,
    table: {
      ...table,
      rows
    },
    children: cells.map((cell) =>
      createTextCellContentFixture(cell, cell.gridRect.startRow === 0
        ? "Header"
        : `Body ${cell.gridRect.startRow}`)
    )
  };

  return {
    ...document,
    children: [tableWithHeader]
  };
}

/**
 * Creates a table with one row whose right cell spans more than one page.
 *
 * @returns Layout document with a single oversized table row in flow coordinates.
 */
function createDocumentWithOversizedTableCell(): QuireLayoutDocument {
  const tableRange = { from: 10, to: 60 };
  const rowRange = { from: 11, to: 50 };
  const tableRect = { x: 0, y: 0, width: 500, height: 96 };
  const rowRect = tableRect;
  const leftCell = createOversizedCellFixture({
    id: "wordTable-0:cell-0-0",
    semanticCellId: "semantic:r0:c0:g1:1",
    range: rowRange,
    rect: { x: 0, y: 0, width: 250, height: 96 },
    contentRect: { x: 5, y: 0, width: 240, height: 96 },
    startColumn: 0
  });
  const rightCell = createOversizedCellFixture({
    id: "wordTable-0:cell-0-1",
    semanticCellId: "semantic:r0:c1:g1:1",
    range: rowRange,
    rect: { x: 250, y: 0, width: 250, height: 96 },
    contentRect: { x: 255, y: 0, width: 240, height: 96 },
    startColumn: 1
  });
  const rightCellParagraph: QuireLayoutContainer = {
    id: "wordTable-0:cell-0-1:paragraph",
    range: { from: 12, to: 28 },
    rect: { x: 255, y: 0, width: 120, height: 96 },
    textFragments: createTableLineFragments(),
    children: []
  };
  const rightCellBox = createTableCellBox(rightCell, [rightCellParagraph]);
  const tableBox: QuireLayoutContainer = {
    id: "wordTable-0:layout",
    range: tableRange,
    rect: tableRect,
    table: {
      tableId: "wordTable-0",
      fragmentId: "wordTable-0",
      geometryId: "wordTable-0",
      tableRange,
      style: {
        backgroundColor: null,
        borderColor: "#cbd5e1",
        borderWidth: 1
      },
      borders: null,
      rect: tableRect,
      tracks: [
        { id: "wordTable-0:col-0", columnIndex: 0, x: 0, width: 250 },
        { id: "wordTable-0:col-1", columnIndex: 1, x: 250, width: 250 }
      ],
      rows: [
        {
          id: "wordTable-0:row-0",
          sourceRowId: "row:r0",
          rowIndex: 0,
          isHeader: false,
          cantSplit: false,
          range: rowRange,
          rect: rowRect
        }
      ],
      cells: [leftCell, rightCell],
      hitTargets: [leftCell, rightCell].map((cell) => ({
        id: `wordTable-0:hit:${cell.semanticCellId}`,
        kind: "cell",
        tableId: "wordTable-0",
        semanticCellId: cell.semanticCellId,
        originExplicitCellId: cell.originExplicitCellId,
        explicitCellIds: cell.explicitCellIds,
        originCellPos: cell.originCellPos,
        range: rowRange,
        rect: cell.rect
      }))
    },
    children: [rightCellBox]
  };

  return {
    id: "doc",
    range: tableRange,
    rect: tableRect,
    children: [tableBox],
    anchors: [],
    anchorOccurrenceGaps: [],
    anchorRegionProducts: createEmptyAnchorRegionProducts(),
    anchorPlacementGaps: [],
    hitTargets: [],
    pages: []
  };
}

/**
 * Creates an oversized table cell whose text lives under an extra nested block.
 *
 * @returns Layout document with nested recursive table-cell content.
 */
function createDocumentWithNestedOversizedTableCell(): QuireLayoutDocument {
  const document = createDocumentWithOversizedTableCell();
  const tableBox = document.children[0];

  if (tableBox === undefined || !isTestLayoutContainer(tableBox)) {
    return document;
  }

  const rightCellBox = tableBox.children[0];

  if (rightCellBox === undefined || !isTestLayoutContainer(rightCellBox)) {
    return document;
  }

  const nested: QuireLayoutContainer = {
    id: "wordTable-0:cell-0-1:nested",
    range: { from: 12, to: 28 },
    rect: { x: 255, y: 0, width: 120, height: 96 },
    children: rightCellBox.children
  };
  const nestedCell: QuireLayoutContainer = {
    ...rightCellBox,
    children: [nested]
  };
  const nestedTable: QuireLayoutContainer = {
    ...tableBox,
    children: [nestedCell]
  };

  return {
    ...document,
    children: [nestedTable]
  };
}

/**
 * Creates one oversized-cell fragment fixture.
 *
 * @param options - Cell geometry and identity.
 * @returns Table cell fragment in flow coordinates.
 */
function createOversizedCellFixture(options: {
  readonly id: string;
  readonly semanticCellId: string;
  readonly range: { readonly from: number; readonly to: number };
  readonly rect: { readonly x: number; readonly y: number; readonly width: number; readonly height: number };
  readonly contentRect: { readonly x: number; readonly y: number; readonly width: number; readonly height: number };
  readonly startColumn: number;
}) {
  return {
    id: options.id,
    semanticCellId: options.semanticCellId,
    originExplicitCellId: options.id.replace("wordTable-0:", "explicit:"),
    explicitCellIds: [options.id.replace("wordTable-0:", "explicit:")],
    originCellPos: options.range.from,
    range: options.range,
    shading: null,
    backgroundColor: null,
    borders: null,
    cellMargins: null,
    preferredWidth: null,
    gridRect: {
      startRow: 0,
      startColumn: options.startColumn,
      rowSpan: 1,
      columnSpan: 1
    },
    rect: options.rect,
    contentRect: options.contentRect,
    contentChildren: []
  };
}

/**
 * Creates four deterministic text lines inside the oversized cell.
 *
 * @returns Text fragments in flow coordinates.
 */
function createTableLineFragments() {
  return Array.from({ length: 4 }, (_, index) => ({
    id: `fragment-${index}`,
    text: `L${index}`,
    range: { from: 12 + index * 4, to: 16 + index * 4 },
    rect: {
      x: 255,
      y: index * 24,
      width: 120,
      height: 24
    },
    font: "16px sans-serif",
    lineHeight: 24,
    baseline: index * 24 + 18,
    caretStops: []
  }));
}

/**
 * Creates a visible text child tree for one table cell fixture.
 *
 * @param cell - Table cell whose content rectangle owns the child tree.
 * @param text - Text label to paint inside the cell.
 * @returns Cell content container with one paragraph child.
 */
function createTextCellContentFixture(
  cell: QuireTableCellFragment,
  text: string
): QuireLayoutContainer {
  const lineHeight = 18;
  const paragraph: QuireLayoutContainer = {
    id: `${cell.id}:paragraph`,
    range: cell.range,
    rect: cell.contentRect,
    textFragments: [{
      id: `${cell.id}:fragment`,
      text,
      range: cell.range,
      rect: { ...cell.contentRect, height: lineHeight },
      font: "16px sans-serif",
      lineHeight,
      baseline: cell.contentRect.y + 14,
      caretStops: []
    }],
    children: []
  };

  return createTableCellBox(cell, [paragraph]);
}

/**
 * Creates a retained source box for a table cell fixture.
 *
 * @param cell - Table cell represented by the source box.
 * @param children - Low-level content children owned by the cell.
 * @returns Table-cell source box with explicit retained sub-layout identity.
 */
function createTableCellBox(
  cell: QuireTableCellFragment,
  children: readonly QuireLayoutBox[]
): QuireLayoutContainer {
  const box: QuireLayoutContainer = {
    id: cell.id,
    range: cell.range,
    rect: cell.contentRect,
    children
  };

  return retainQuireTestTableCellSubLayoutIdentity(box, cell) as QuireLayoutContainer;
}

/**
 * Creates one deterministic text fragment for table projection tests.
 *
 * @param options - Fragment identity, range, rectangle, text, and line height.
 * @returns Text fragment in flow coordinates.
 */
function createTextFragmentFixture(options: {
  readonly id: string;
  readonly text: string;
  readonly range: { readonly from: number; readonly to: number };
  readonly rect: { readonly x: number; readonly y: number; readonly width: number; readonly height: number };
  readonly lineHeight: number;
}) {
  return {
    id: options.id,
    text: options.text,
    range: options.range,
    rect: options.rect,
    font: "16px sans-serif",
    lineHeight: options.lineHeight,
    baseline: options.rect.y + options.lineHeight - 4,
    caretStops: []
  };
}

/**
 * Reads projected table-cell child summaries from a layout box.
 *
 * @param box - Projected layout box to inspect.
 * @returns Stable child summaries used by oversized table pagination tests.
 */
function readProjectedChildRanges(box: QuireLayoutContainer | QuireLayoutDocument) {
  return readProjectedChildBoxes(box).map((child) => ({
    id: child.id,
    range: child.range,
    rect: child.rect,
    text: isTestLayoutContainer(child)
      ? child.children.flatMap((grandchild) =>
          grandchild.textFragments?.map((fragment) => fragment.text) ?? []
        )
      : []
  }));
}

/**
 * Reads projected table-cell text summaries including vertical placement.
 *
 * @param box - Projected layout box to inspect.
 * @returns Stable child summaries with text y and baseline for pagination tests.
 */
function readProjectedTextChildRanges(box: QuireLayoutContainer | QuireLayoutDocument) {
  return readProjectedChildBoxes(box).map((child) => ({
    id: child.id,
    range: child.range,
    rect: child.rect,
    text: isTestLayoutContainer(child)
      ? child.children.flatMap((grandchild) =>
          grandchild.textFragments?.map((fragment) => ({
            text: fragment.text,
            y: fragment.rect.y,
            baseline: fragment.baseline
          })) ?? []
        )
      : []
  }));
}

/**
 * Reads one level of nested projected table-cell child summaries.
 *
 * @param box - Projected table layout box to inspect.
 * @returns Stable nested child summaries for recursive table pagination tests.
 */
function readProjectedNestedChildRanges(box: QuireLayoutContainer | QuireLayoutDocument) {
  return readProjectedChildBoxes(box).map((child) => ({
    id: child.id,
    range: child.range,
    rect: child.rect,
    children: isTestLayoutContainer(child)
      ? child.children.map((grandchild) => ({
          id: grandchild.id,
          range: grandchild.range,
          rect: grandchild.rect,
          text: isTestLayoutContainer(grandchild)
            ? grandchild.children.flatMap((leaf) =>
                leaf.textFragments?.map((fragment) => fragment.text) ?? []
              )
            : []
        }))
      : []
  }));
}

/**
 * Reads projected child boxes from the canonical sub-layout provenance when present.
 *
 * @param box - Projected layout box or document to inspect.
 * @returns Page-local child boxes retained for test summaries.
 */
function readProjectedChildBoxes(
  box: QuireLayoutContainer | QuireLayoutDocument
): readonly QuireLayoutBox[] {
  const subLayoutSourceBoxes = readSubLayoutSourceBoxes(box);

  return subLayoutSourceBoxes.length === 0
    ? box.children
    : subLayoutSourceBoxes;
}

/**
 * Reads retained source boxes from a projected sub-layout container.
 *
 * @param box - Projected layout box or document to inspect.
 * @returns Source boxes retained by sub-layout child fragments.
 */
function readSubLayoutSourceBoxes(
  box: QuireLayoutBox
): readonly QuireLayoutBox[] {
  const candidate = box as QuireLayoutBox & {
    readonly subLayoutFragments?: readonly QuireLayoutBoxSubLayoutFragment[] | undefined;
  };
  const sourceBoxes: QuireLayoutBox[] = [];

  for (const fragment of candidate.subLayoutFragments ?? []) {
    for (const fragmentSource of fragment.subLayout.view.fragmentSources) {
      sourceBoxes.push(fragmentSource.sourceBox);
    }
  }

  return sourceBoxes;
}

/**
 * Checks whether a test layout box owns children.
 *
 * @param box - Layout box to inspect.
 * @returns Whether the box can be treated as a container.
 */
function isTestLayoutContainer(
  box: QuireLayoutBox
): box is QuireLayoutContainer {
  return Array.isArray((box as { readonly children?: unknown }).children);
}

/**
 * Creates one row, cell, and hit target fixture for row pagination tests.
 *
 * @param rowIndex - Zero-based source row index.
 * @param tableRange - Source table document range.
 * @returns Row, cell, and hit target metadata in flow coordinates.
 */
function createRowFixture(
  rowIndex: number,
  tableRange: { readonly from: number; readonly to: number }
) {
  const range = {
    from: 11 + rowIndex * 10,
    to: 20 + rowIndex * 10
  };
  const y = rowIndex * 28;
  const rect = { x: 0, y, width: 500, height: 28 };
  const semanticCellId = `semantic:r${rowIndex}:c0:g1:1`;

  return {
    row: {
      id: `wordTable-0:row-${rowIndex}`,
      sourceRowId: `row:r${rowIndex}`,
      rowIndex,
      isHeader: false,
      cantSplit: false,
      range,
      rect
    },
    cell: {
      id: `wordTable-0:cell-${rowIndex}-0`,
      semanticCellId,
      originExplicitCellId: `cell:r${rowIndex}:c0:g0:1`,
      explicitCellIds: [`cell:r${rowIndex}:c0:g0:1`],
      originCellPos: range.from,
      range,
      shading: null,
      backgroundColor: null,
      borders: null,
      cellMargins: null,
      preferredWidth: null,
      gridRect: {
        startRow: rowIndex,
        startColumn: 0,
        rowSpan: 1,
        columnSpan: 1
      },
      rect,
      contentRect: { x: 5, y: y + 5, width: 490, height: 18 },
      contentChildren: []
    },
    hitTarget: {
      id: `wordTable-0:hit:${semanticCellId}`,
      kind: "cell",
      tableId: "wordTable-0",
      semanticCellId,
      originExplicitCellId: `cell:r${rowIndex}:c0:g0:1`,
      explicitCellIds: [`cell:r${rowIndex}:c0:g0:1`],
      originCellPos: range.from,
      range,
      rect
    },
    tableRange
  };
}
