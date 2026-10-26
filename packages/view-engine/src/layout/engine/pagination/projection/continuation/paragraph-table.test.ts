import { describe, expect, it } from "vitest";
import type {
  QuireLayoutBox,
  QuireLayoutContainer,
  QuireLayoutDocument
} from "../../../types";
import type {
  QuireTableCellFragment,
  QuireTableRowFragment
} from "../../../table";
import type { QuireLayoutBoxSubLayoutFragment } from "../../../sub-layout";
import { paginateQuireLayoutDocument } from "../..";
import {
  createEmptyAnchorRegionProducts,
  createLineFragments,
  createPageGeometry,
  summarizePageSourceFlowBands,
  summarizePageSourceFragments
} from "../../../../../../test-support/layout/pagination";
import { projectQuireLayoutDocumentToPages } from "../index";
import { retainQuireTestTableCellSubLayoutIdentity } from "../../../../../../test-support/layout/table-cell-sub-layout";

describe("canvas paragraph/table continuation projection", () => {
  it("anchors a mixed continuation page to paragraph text before a following table", () => {
    const projected = paginateQuireLayoutDocument({
      document: createDocumentWithParagraphContinuationBeforeTable(),
      pageGeometry: createPageGeometry(80)
    });

    expect(projected.pages.map((page) => ({
      range: page.range,
      rect: page.rect
    }))).toEqual([
      { range: { from: 1, to: 10 }, rect: { x: 40, y: 50, width: 500, height: 72 } },
      { range: { from: 10, to: 30 }, rect: { x: 40, y: 850, width: 500, height: 60 } }
    ]);
    expect(summarizePageSourceFlowBands(projected.pages)).toEqual([
      { pageIndex: 0, sourceFlowY: 0, sourceFlowHeight: 72 },
      { pageIndex: 1, sourceFlowY: 72, sourceFlowHeight: 60 }
    ]);
    expect(summarizePageSourceFragments(projected.pages).map(
      ({ pageIndex, kind, ownerId, range }) => ({ pageIndex, kind, ownerId, range })
    )).toEqual([
      {
        pageIndex: 0,
        kind: "textLine",
        ownerId: "paragraph-before-table",
        range: { from: 1, to: 4 }
      },
      {
        pageIndex: 0,
        kind: "textLine",
        ownerId: "paragraph-before-table",
        range: { from: 4, to: 7 }
      },
      {
        pageIndex: 0,
        kind: "textLine",
        ownerId: "paragraph-before-table",
        range: { from: 7, to: 10 }
      },
      {
        pageIndex: 1,
        kind: "textLine",
        ownerId: "paragraph-before-table",
        range: { from: 10, to: 13 }
      }
    ]);
    expect(projected.children.map((box) => ({
      id: box.id,
      rect: box.rect,
      text: box.textFragments?.map((fragment) => fragment.text),
      tableRows: box.table?.rows.map((row) => row.rect)
    }))).toEqual([
      {
        id: "paragraph-before-table#p0",
        rect: { x: 40, y: 50, width: 120, height: 72 },
        text: ["L0", "L1", "L2"],
        tableRows: undefined
      },
      {
        id: "paragraph-before-table#p1",
        rect: { x: 40, y: 850, width: 120, height: 24 },
        text: ["L3"],
        tableRows: undefined
      },
      {
        id: "wordTable-after-paragraph:layout#p1",
        rect: { x: 40, y: 882, width: 500, height: 28 },
        text: undefined,
        tableRows: [{ x: 40, y: 882, width: 500, height: 28 }]
      }
    ]);
  });

  it("keeps following table cell text on a paragraph-continuation page", () => {
    const projected = paginateQuireLayoutDocument({
      document: createDocumentWithParagraphContinuationBeforeTextTable(),
      pageGeometry: createPageGeometry(80)
    });

    expect(summarizePageSourceFlowBands(projected.pages)).toEqual([
      { pageIndex: 0, sourceFlowY: 0, sourceFlowHeight: 72 },
      { pageIndex: 1, sourceFlowY: 72, sourceFlowHeight: 60 }
    ]);
    expect(summarizePageSourceFragments(projected.pages).map(
      ({ pageIndex, kind, ownerId, range }) => ({ pageIndex, kind, ownerId, range })
    )).toEqual([
      {
        pageIndex: 0,
        kind: "textLine",
        ownerId: "paragraph-before-table",
        range: { from: 1, to: 4 }
      },
      {
        pageIndex: 0,
        kind: "textLine",
        ownerId: "paragraph-before-table",
        range: { from: 4, to: 7 }
      },
      {
        pageIndex: 0,
        kind: "textLine",
        ownerId: "paragraph-before-table",
        range: { from: 7, to: 10 }
      },
      {
        pageIndex: 1,
        kind: "textLine",
        ownerId: "paragraph-before-table",
        range: { from: 10, to: 13 }
      },
      {
        pageIndex: 1,
        kind: "tableCellLine",
        ownerId: "wordTable-after-paragraph:cell-0-0",
        range: { from: 21, to: 30 }
      }
    ]);
    expect(projected.children.map((box) => ({
      id: box.id,
      rect: box.rect,
      children: isTestLayoutContainer(box) ? readProjectedChildRanges(box) : []
    }))).toEqual([
      {
        id: "paragraph-before-table#p0",
        rect: { x: 40, y: 50, width: 120, height: 72 },
        children: []
      },
      {
        id: "paragraph-before-table#p1",
        rect: { x: 40, y: 850, width: 120, height: 24 },
        children: []
      },
      {
        id: "wordTable-after-paragraph:layout#p1",
        rect: { x: 40, y: 882, width: 500, height: 28 },
        children: [
          {
            id: "wordTable-after-paragraph:cell-0-0",
            range: { from: 21, to: 30 },
            rect: { x: 45, y: 887, width: 490, height: 18 },
            text: ["After table text"]
          }
        ]
      }
    ]);
  });

  it("keeps a table after a multi-page paragraph continuation in forward flow order", () => {
    const projected = paginateQuireLayoutDocument({
      document: createDocumentWithLongParagraphContinuationBeforeTextTable(),
      pageGeometry: createPageGeometry(80)
    });

    expect(summarizePageSourceFlowBands(projected.pages)).toEqual([
      { pageIndex: 0, sourceFlowY: 0, sourceFlowHeight: 72 },
      { pageIndex: 1, sourceFlowY: 72, sourceFlowHeight: 72 },
      { pageIndex: 2, sourceFlowY: 144, sourceFlowHeight: 60 }
    ]);
    expect(summarizePageSourceFragments(projected.pages).map(
      ({ pageIndex, kind, ownerId, range }) => ({ pageIndex, kind, ownerId, range })
    )).toEqual([
      {
        pageIndex: 0,
        kind: "textLine",
        ownerId: "long-paragraph-before-table",
        range: { from: 1, to: 4 }
      },
      {
        pageIndex: 0,
        kind: "textLine",
        ownerId: "long-paragraph-before-table",
        range: { from: 4, to: 7 }
      },
      {
        pageIndex: 0,
        kind: "textLine",
        ownerId: "long-paragraph-before-table",
        range: { from: 7, to: 10 }
      },
      {
        pageIndex: 1,
        kind: "textLine",
        ownerId: "long-paragraph-before-table",
        range: { from: 10, to: 13 }
      },
      {
        pageIndex: 1,
        kind: "textLine",
        ownerId: "long-paragraph-before-table",
        range: { from: 13, to: 16 }
      },
      {
        pageIndex: 1,
        kind: "textLine",
        ownerId: "long-paragraph-before-table",
        range: { from: 16, to: 19 }
      },
      {
        pageIndex: 2,
        kind: "textLine",
        ownerId: "long-paragraph-before-table",
        range: { from: 19, to: 22 }
      },
      {
        pageIndex: 2,
        kind: "tableCellLine",
        ownerId: "wordTable-after-long-paragraph:cell-0-0",
        range: { from: 31, to: 40 }
      }
    ]);
    expect(projected.children.map((box) => ({
      id: box.id,
      range: box.range,
      rect: box.rect,
      text: box.textFragments?.map((fragment) => fragment.text),
      children: isTestLayoutContainer(box) ? readProjectedChildRanges(box) : []
    }))).toEqual([
      {
        id: "long-paragraph-before-table#p0",
        range: { from: 1, to: 10 },
        rect: { x: 40, y: 50, width: 120, height: 72 },
        text: ["L0", "L1", "L2"],
        children: []
      },
      {
        id: "long-paragraph-before-table#p1",
        range: { from: 10, to: 19 },
        rect: { x: 40, y: 850, width: 120, height: 72 },
        text: ["L3", "L4", "L5"],
        children: []
      },
      {
        id: "long-paragraph-before-table#p2",
        range: { from: 19, to: 22 },
        rect: { x: 40, y: 1650, width: 120, height: 24 },
        text: ["L6"],
        children: []
      },
      {
        id: "wordTable-after-long-paragraph:layout#p2",
        range: { from: 31, to: 40 },
        rect: { x: 40, y: 1682, width: 500, height: 28 },
        text: undefined,
        children: [
          {
            id: "wordTable-after-long-paragraph:cell-0-0",
            range: { from: 31, to: 40 },
            rect: { x: 45, y: 1687, width: 490, height: 18 },
            text: ["After long paragraph table text"]
          }
        ]
      }
    ]);
  });

  it("keeps row-span table text on the first row fragment after paragraph continuation", () => {
    const projected = paginateQuireLayoutDocument({
      document: createDocumentWithParagraphContinuationBeforeRowSpanTextTable(),
      pageGeometry: createPageGeometry(80)
    });

    expect(summarizePageSourceFlowBands(projected.pages)).toEqual([
      { pageIndex: 0, sourceFlowY: 0, sourceFlowHeight: 72 },
      { pageIndex: 1, sourceFlowY: 72, sourceFlowHeight: 60 },
      { pageIndex: 2, sourceFlowY: 132, sourceFlowHeight: 28 }
    ]);
    expect(summarizePageSourceFragments(projected.pages).map(
      ({ pageIndex, kind, ownerId, range }) => ({ pageIndex, kind, ownerId, range })
    )).toEqual([
      {
        pageIndex: 0,
        kind: "textLine",
        ownerId: "paragraph-before-table",
        range: { from: 1, to: 4 }
      },
      {
        pageIndex: 0,
        kind: "textLine",
        ownerId: "paragraph-before-table",
        range: { from: 4, to: 7 }
      },
      {
        pageIndex: 0,
        kind: "textLine",
        ownerId: "paragraph-before-table",
        range: { from: 7, to: 10 }
      },
      {
        pageIndex: 1,
        kind: "textLine",
        ownerId: "paragraph-before-table",
        range: { from: 10, to: 13 }
      },
      {
        pageIndex: 1,
        kind: "tableCellLine",
        ownerId: "wordTable-rowspan-after-paragraph:cell-0-0",
        range: { from: 21, to: 30 }
      },
      {
        pageIndex: 1,
        kind: "tableCellLine",
        ownerId: "wordTable-rowspan-after-paragraph:cell-0-1",
        range: { from: 21, to: 30 }
      },
      {
        pageIndex: 2,
        kind: "tableCellLine",
        ownerId: "wordTable-rowspan-after-paragraph:cell-1-1",
        range: { from: 31, to: 40 }
      }
    ]);
    expect(projected.children.map((box) => ({
      id: box.id,
      rect: box.rect,
      children: isTestLayoutContainer(box) ? readProjectedChildRanges(box) : []
    }))).toEqual([
      {
        id: "paragraph-before-table#p0",
        rect: { x: 40, y: 50, width: 120, height: 72 },
        children: []
      },
      {
        id: "paragraph-before-table#p1",
        rect: { x: 40, y: 850, width: 120, height: 24 },
        children: []
      },
      {
        id: "wordTable-rowspan-after-paragraph:layout#p1",
        rect: { x: 40, y: 882, width: 500, height: 28 },
        children: [
          {
            id: "wordTable-rowspan-after-paragraph:cell-0-0",
            range: { from: 21, to: 30 },
            rect: { x: 45, y: 887, width: 240, height: 23 },
            text: ["Row-span edge"]
          },
          {
            id: "wordTable-rowspan-after-paragraph:cell-0-1",
            range: { from: 21, to: 30 },
            rect: { x: 295, y: 887, width: 240, height: 18 },
            text: ["Top row override"]
          }
        ]
      },
      {
        id: "wordTable-rowspan-after-paragraph:layout#p2",
        rect: { x: 40, y: 1650, width: 500, height: 28 },
        children: [
          {
            id: "wordTable-rowspan-after-paragraph:cell-1-1",
            range: { from: 31, to: 40 },
            rect: { x: 295, y: 1655, width: 240, height: 18 },
            text: ["Bottom row table fallback"]
          }
        ]
      }
    ]);
  });

  it("keeps table cell child text when measured source-flow owns a range-mismatched row", () => {
    const document = createDocumentWithParagraphContinuationBeforeRowSpanTextTable();
    const projected = projectQuireLayoutDocumentToPages({
      document: {
        ...document,
        pages: [{
          pageIndex: 3,
          range: { from: 100, to: 110 },
          pageRect: { x: 0, y: 2400, width: 600, height: 800 },
          bodyRect: { x: 40, y: 2450, width: 500, height: 56 },
          rect: { x: 40, y: 2450, width: 500, height: 56 },
          sourceFlowY: 104,
          sourceFlowHeight: 56,
          endInfo: { openMarks: [], openNodes: [] }
        }]
      }
    });

    expect(projected.children.filter((box) =>
      box.id.startsWith("wordTable-rowspan-after-paragraph")
    ).map((box) => ({
      id: box.id,
      rect: box.rect,
      children: isTestLayoutContainer(box) ? readProjectedChildRanges(box) : []
    }))).toEqual([
      {
        id: "wordTable-rowspan-after-paragraph:layout#p3",
        rect: { x: 40, y: 2450, width: 500, height: 56 },
        children: [
          {
            id: "wordTable-rowspan-after-paragraph:cell-0-0#p3",
            range: { from: 21, to: 30 },
            rect: { x: 45, y: 2455, width: 240, height: 51 },
            text: ["Row-span edge"]
          },
          {
            id: "wordTable-rowspan-after-paragraph:cell-0-1#p3",
            range: { from: 21, to: 30 },
            rect: { x: 295, y: 2455, width: 240, height: 18 },
            text: ["Top row override"]
          },
          {
            id: "wordTable-rowspan-after-paragraph:cell-1-1#p3",
            range: { from: 31, to: 40 },
            rect: { x: 295, y: 2483, width: 240, height: 18 },
            text: ["Bottom row table fallback"]
          }
        ]
      }
    ]);
  });

  it("keeps intersecting table cell text when the line starts before the cell fragment clip", () => {
    const document = createDocumentWithParagraphContinuationBeforeRowSpanTextTable();
    const projected = projectQuireLayoutDocumentToPages({
      document: {
        ...document,
        pages: [{
          pageIndex: 3,
          range: { from: 100, to: 110 },
          pageRect: { x: 0, y: 2400, width: 600, height: 800 },
          bodyRect: { x: 40, y: 2450, width: 500, height: 20 },
          rect: { x: 40, y: 2450, width: 500, height: 20 },
          sourceFlowY: 112,
          sourceFlowHeight: 20,
          endInfo: { openMarks: [], openNodes: [] }
        }]
      }
    });

    expect(projected.children.filter((box) =>
      box.id.startsWith("wordTable-rowspan-after-paragraph")
    ).map((box) => ({
      id: box.id,
      rect: box.rect,
      children: isTestLayoutContainer(box) ? readProjectedChildRanges(box) : []
    }))).toEqual([
      {
        id: "wordTable-rowspan-after-paragraph:layout#p3",
        rect: { x: 40, y: 2450, width: 500, height: 20 },
        children: [
          {
            id: "wordTable-rowspan-after-paragraph:cell-0-0#p3",
            range: { from: 21, to: 30 },
            rect: { x: 45, y: 2450, width: 240, height: 20 },
            text: ["Row-span edge"]
          },
          {
            id: "wordTable-rowspan-after-paragraph:cell-0-1#p3",
            range: { from: 21, to: 30 },
            rect: { x: 295, y: 2450, width: 240, height: 15 },
            text: ["Top row override"]
          }
        ]
      }
    ]);
  });
});

/**
 * Creates a split paragraph whose continuation page also contains a following table.
 *
 * @returns Layout document where the second page must anchor to paragraph text before the table.
 */
function createDocumentWithParagraphContinuationBeforeTable(): QuireLayoutDocument {
  const paragraph: QuireLayoutBox = {
    id: "paragraph-before-table",
    range: { from: 1, to: 13 },
    rect: { x: 0, y: 0, width: 500, height: 96 },
    textFragments: createLineFragments({ lineCount: 4, y: 0 })
  };
  const rowRange = { from: 21, to: 30 };
  const tableRange = { from: 20, to: 40 };
  const rowRect = { x: 0, y: 104, width: 500, height: 28 };
  const cell = {
    id: "wordTable-after-paragraph:cell-0-0",
    semanticCellId: "semantic:after:r0:c0:g1:1",
    originExplicitCellId: "cell:after:r0:c0:g1:1",
    explicitCellIds: ["cell:after:r0:c0:g1:1"],
    originCellPos: rowRange.from,
    range: rowRange,
    shading: null,
    backgroundColor: null,
    borders: null,
    cellMargins: null,
    preferredWidth: null,
    gridRect: {
      startRow: 0,
      startColumn: 0,
      rowSpan: 1,
      columnSpan: 1
    },
    rect: rowRect,
    contentRect: { x: 5, y: 109, width: 490, height: 18 },
    contentChildren: []
  } satisfies QuireTableCellFragment;
  const cellBox = createTableCellBox(cell, []);
  const tableBox: QuireLayoutContainer = {
    id: "wordTable-after-paragraph:layout",
    range: tableRange,
    rect: rowRect,
    table: {
      tableId: "wordTable-after-paragraph",
      fragmentId: "wordTable-after-paragraph",
      geometryId: "wordTable-after-paragraph",
      tableRange,
      style: {
        backgroundColor: null,
        borderColor: "#cbd5e1",
        borderWidth: 1
      },
      borders: null,
      rect: rowRect,
      tracks: [{ id: "wordTable-after-paragraph:col-0", columnIndex: 0, x: 0, width: 500 }],
      rows: [{
        id: "wordTable-after-paragraph:row-0",
        sourceRowId: "row:after:r0",
        rowIndex: 0,
        isHeader: false,
        cantSplit: false,
        range: rowRange,
        rect: rowRect
      }],
      cells: [cell],
      hitTargets: [{
        id: "wordTable-after-paragraph:hit:0",
        kind: "cell",
        tableId: "wordTable-after-paragraph",
        semanticCellId: cell.semanticCellId,
        originExplicitCellId: cell.originExplicitCellId,
        explicitCellIds: cell.explicitCellIds,
        originCellPos: cell.originCellPos,
        range: rowRange,
        rect: rowRect
      }]
    },
    children: [cellBox]
  };

  return {
    id: "doc",
    range: { from: paragraph.range.from, to: tableRange.to },
    rect: { x: 0, y: 0, width: 500, height: 132 },
    children: [paragraph, tableBox],
    anchors: [],
    anchorOccurrenceGaps: [],
    anchorRegionProducts: createEmptyAnchorRegionProducts(),
    anchorPlacementGaps: [],
    hitTargets: [],
    pages: []
  };
}

/**
 * Creates a split paragraph followed by a table with visible cell text.
 *
 * @returns Layout document where the table shares a page with paragraph continuation text.
 */
function createDocumentWithParagraphContinuationBeforeTextTable(): QuireLayoutDocument {
  const document = createDocumentWithParagraphContinuationBeforeTable();
  const tableBox = document.children[1];

  if (tableBox === undefined || !isTestLayoutContainer(tableBox) || tableBox.table === undefined) {
    return document;
  }

  const cell = tableBox.table.cells[0];

  if (cell === undefined) {
    return document;
  }
  const tableWithText: QuireLayoutContainer = {
    ...tableBox,
    children: [createTextCellContentFixture(cell, "After table text")]
  };

  return {
    ...document,
    children: [
      document.children[0]!,
      tableWithText
    ]
  };
}

/**
 * Creates a long split paragraph followed by a table with visible cell text.
 *
 * @returns Layout document where the table remains after the final paragraph continuation page.
 */
function createDocumentWithLongParagraphContinuationBeforeTextTable(): QuireLayoutDocument {
  const paragraph: QuireLayoutBox = {
    id: "long-paragraph-before-table",
    range: { from: 1, to: 22 },
    rect: { x: 0, y: 0, width: 500, height: 168 },
    textFragments: createLineFragments({ lineCount: 7, y: 0 })
  };
  const rowRange = { from: 31, to: 40 };
  const tableRange = { from: 30, to: 50 };
  const rowRect = { x: 0, y: 176, width: 500, height: 28 };
  const cell = {
    id: "wordTable-after-long-paragraph:cell-0-0",
    semanticCellId: "semantic:after-long:r0:c0:g1:1",
    originExplicitCellId: "cell:after-long:r0:c0:g1:1",
    explicitCellIds: ["cell:after-long:r0:c0:g1:1"],
    originCellPos: rowRange.from,
    range: rowRange,
    shading: null,
    backgroundColor: null,
    borders: null,
    cellMargins: null,
    preferredWidth: null,
    gridRect: {
      startRow: 0,
      startColumn: 0,
      rowSpan: 1,
      columnSpan: 1
    },
    rect: rowRect,
    contentRect: { x: 5, y: 181, width: 490, height: 18 },
    contentChildren: []
  } satisfies QuireTableCellFragment;
  const tableBox: QuireLayoutContainer = {
    id: "wordTable-after-long-paragraph:layout",
    range: tableRange,
    rect: rowRect,
    table: {
      tableId: "wordTable-after-long-paragraph",
      fragmentId: "wordTable-after-long-paragraph",
      geometryId: "wordTable-after-long-paragraph",
      tableRange,
      style: {
        backgroundColor: null,
        borderColor: "#cbd5e1",
        borderWidth: 1
      },
      borders: null,
      rect: rowRect,
      tracks: [{ id: "wordTable-after-long-paragraph:col-0", columnIndex: 0, x: 0, width: 500 }],
      rows: [{
        id: "wordTable-after-long-paragraph:row-0",
        sourceRowId: "row:after-long:r0",
        rowIndex: 0,
        isHeader: false,
        cantSplit: false,
        range: rowRange,
        rect: rowRect
      }],
      cells: [cell],
      hitTargets: [{
        id: "wordTable-after-long-paragraph:hit:0",
        kind: "cell",
        tableId: "wordTable-after-long-paragraph",
        semanticCellId: cell.semanticCellId,
        originExplicitCellId: cell.originExplicitCellId,
        explicitCellIds: cell.explicitCellIds,
        originCellPos: cell.originCellPos,
        range: rowRange,
        rect: rowRect
      }]
    },
    children: [
      createTextCellContentFixture(cell, "After long paragraph table text")
    ]
  };

  return {
    id: "doc",
    range: { from: paragraph.range.from, to: tableRange.to },
    rect: { x: 0, y: 0, width: 500, height: 204 },
    children: [paragraph, tableBox],
    anchors: [],
    anchorOccurrenceGaps: [],
    anchorRegionProducts: createEmptyAnchorRegionProducts(),
    anchorPlacementGaps: [],
    hitTargets: [],
    pages: []
  };
}

/**
 * Creates a split paragraph followed by a row-spanning table.
 *
 * @returns Layout document whose row-span table splits after its first row.
 */
function createDocumentWithParagraphContinuationBeforeRowSpanTextTable(): QuireLayoutDocument {
  const paragraph: QuireLayoutBox = {
    id: "paragraph-before-table",
    range: { from: 1, to: 13 },
    rect: { x: 0, y: 0, width: 500, height: 96 },
    textFragments: createLineFragments({ lineCount: 4, y: 0 })
  };
  const tableRange = { from: 20, to: 50 };
  const rows = [
    createOffsetVerticalMergeRowFixture("wordTable-rowspan-after-paragraph", 0, {
      from: 21,
      to: 30
    }, 104),
    createOffsetVerticalMergeRowFixture("wordTable-rowspan-after-paragraph", 1, {
      from: 31,
      to: 40
    }, 104)
  ];
  const mergedCell = createOffsetVerticalMergeCellFixture({
    tableId: "wordTable-rowspan-after-paragraph",
    id: "wordTable-rowspan-after-paragraph:cell-0-0",
    semanticCellId: "semantic:rowspan-after:r0:c0:g1:2",
    originExplicitCellId: "explicit:rowspan-after:r0:c0",
    explicitCellIds: ["explicit:rowspan-after:r0:c0", "explicit:rowspan-after:r1:c0"],
    range: rows[0]?.range ?? { from: 21, to: 30 },
    rect: { x: 0, y: 104, width: 250, height: 56 },
    contentRect: { x: 5, y: 109, width: 240, height: 51 },
    startRow: 0,
    startColumn: 0,
    rowSpan: 2
  });
  const topRightCell = createOffsetVerticalMergeCellFixture({
    tableId: "wordTable-rowspan-after-paragraph",
    id: "wordTable-rowspan-after-paragraph:cell-0-1",
    semanticCellId: "semantic:rowspan-after:r0:c1:g1:1",
    originExplicitCellId: "explicit:rowspan-after:r0:c1",
    explicitCellIds: ["explicit:rowspan-after:r0:c1"],
    range: rows[0]?.range ?? { from: 21, to: 30 },
    rect: { x: 250, y: 104, width: 250, height: 28 },
    contentRect: { x: 255, y: 109, width: 240, height: 18 },
    startRow: 0,
    startColumn: 1,
    rowSpan: 1
  });
  const bottomRightCell = createOffsetVerticalMergeCellFixture({
    tableId: "wordTable-rowspan-after-paragraph",
    id: "wordTable-rowspan-after-paragraph:cell-1-1",
    semanticCellId: "semantic:rowspan-after:r1:c1:g1:1",
    originExplicitCellId: "explicit:rowspan-after:r1:c1",
    explicitCellIds: ["explicit:rowspan-after:r1:c1"],
    range: rows[1]?.range ?? { from: 31, to: 40 },
    rect: { x: 250, y: 132, width: 250, height: 28 },
    contentRect: { x: 255, y: 137, width: 240, height: 18 },
    startRow: 1,
    startColumn: 1,
    rowSpan: 1
  });
  const cells = [mergedCell, topRightCell, bottomRightCell];
  const tableRect = { x: 0, y: 104, width: 500, height: 56 };
  const tableBox: QuireLayoutContainer = {
    id: "wordTable-rowspan-after-paragraph:layout",
    range: tableRange,
    rect: tableRect,
    table: {
      tableId: "wordTable-rowspan-after-paragraph",
      fragmentId: "wordTable-rowspan-after-paragraph",
      geometryId: "wordTable-rowspan-after-paragraph",
      tableRange,
      style: {
        backgroundColor: null,
        borderColor: "#cbd5e1",
        borderWidth: 1
      },
      borders: null,
      rect: tableRect,
      tracks: [
        {
          id: "wordTable-rowspan-after-paragraph:col-0",
          columnIndex: 0,
          x: 0,
          width: 250
        },
        {
          id: "wordTable-rowspan-after-paragraph:col-1",
          columnIndex: 1,
          x: 250,
          width: 250
        }
      ],
      rows,
      cells,
      hitTargets: cells.map((cell) => ({
        id: `wordTable-rowspan-after-paragraph:hit:${cell.semanticCellId}`,
        kind: "cell",
        tableId: "wordTable-rowspan-after-paragraph",
        semanticCellId: cell.semanticCellId,
        originExplicitCellId: cell.originExplicitCellId,
        explicitCellIds: cell.explicitCellIds,
        originCellPos: cell.originCellPos,
        range: cell.range,
        rect: cell.rect
      }))
    },
    children: [
      createTextCellContentFixture(mergedCell, "Row-span edge"),
      createTextCellContentFixture(topRightCell, "Top row override"),
      createTextCellContentFixture(bottomRightCell, "Bottom row table fallback")
    ]
  };

  return {
    id: "doc",
    range: { from: paragraph.range.from, to: tableRange.to },
    rect: { x: 0, y: 0, width: 500, height: 160 },
    children: [paragraph, tableBox],
    anchors: [],
    anchorOccurrenceGaps: [],
    anchorRegionProducts: createEmptyAnchorRegionProducts(),
    anchorPlacementGaps: [],
    hitTargets: [],
    pages: []
  };
}

/**
 * Creates one row fragment offset in document flow.
 *
 * @param tableId - Stable table id.
 * @param rowIndex - Source row index.
 * @param range - Document range owned by the row.
 * @param y - Flow-space table top.
 * @returns Row fragment in flow coordinates.
 */
function createOffsetVerticalMergeRowFixture(
  tableId: string,
  rowIndex: number,
  range: { readonly from: number; readonly to: number },
  y: number
): QuireTableRowFragment {
  return {
    id: `${tableId}:row-${rowIndex}`,
    sourceRowId: `row:r${rowIndex}`,
    rowIndex,
    isHeader: false,
    cantSplit: false,
    range,
    rect: { x: 0, y: y + rowIndex * 28, width: 500, height: 28 }
  };
}

/**
 * Creates one cell fragment offset in document flow.
 *
 * @param options - Cell identity, range, and geometry.
 * @returns Cell fragment in flow coordinates.
 */
function createOffsetVerticalMergeCellFixture(options: {
  readonly tableId: string;
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
 * Reads projected table-cell child summaries from a layout box.
 *
 * @param box - Projected layout box to inspect.
 * @returns Stable child summaries used by paragraph/table continuation tests.
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
