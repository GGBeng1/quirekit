import { describe, expect, it } from "vitest";
import type { QuireTextFragment } from "@quirekit/layout/text";
import type { QuireLayoutContainer } from "../../../types";
import type {
  QuireTableCellFragment,
  QuireTableLayoutSnapshot,
  QuireTableRowFragment
} from "../../../table";
import {
  createQuireRepeatedTableHeaderPageLeadingBand,
  createQuireRepeatedTableHeaderState
} from "../../repeated-table-headers";
import {
  splitQuireTableLayoutContainerAcrossPages,
  type QuireSplitTableLayoutContainer
} from "./table";
import type { QuirePageBodyProjection } from "../types";
import { retainQuireTestTableCellSubLayoutIdentity } from "../../../../../../test-support/layout/table-cell-sub-layout";

describe("split table layout container across pages", () => {
  it("omits source table geometry when the measured window owns no rows or cells", () => {
    const table = createTable();
    const projection = createProjection();
    const containers = splitQuireTableLayoutContainerAcrossPages({
      box: {
        id: "outside-table",
        range: table.tableRange,
        rect: table.rect,
        table,
        children: [createCellBox(table.cells[0]!, [])]
      },
      sourceTable: table,
      projections: [{
        ...projection,
        page: { ...projection.page, sourceFlowY: 100 },
        dy: 100
      }]
    });

    expect(containers).toEqual([]);
    expect(table.rect).toEqual({ x: 0, y: 10, width: 80, height: 20 });
  });

  it("keeps measured cell continuations whose origin range is outside the page range", () => {
    const table = createTable();
    const projection = createProjection();
    const containers = splitQuireTableLayoutContainerAcrossPages({
      box: {
        id: "continued-table",
        range: table.tableRange,
        rect: table.rect,
        table,
        children: [createCellBox(table.cells[0]!, [createFragment({
          id: "continued-line",
          range: { from: 2, to: 8 },
          rect: { x: 0, y: 14, width: 40, height: 10 }
        })])]
      },
      sourceTable: table,
      projections: [{
        ...projection,
        page: { ...projection.page, range: { from: 30, to: 50 } }
      }]
    });

    expect(containers).toHaveLength(1);
    expect(containers[0]?.table?.cells[0]).toMatchObject({
      originCellPos: 1,
      range: { from: 1, to: 10 },
      contentRect: { x: 100, y: 212, width: 80, height: 16 }
    });
    expect(containers[0]?.subLayoutFragments?.[0]?.subLayout.view.fragmentSources[0]
      ?.sourceBox.textFragments?.[0]?.range).toEqual({ from: 2, to: 8 });
  });

  it("keeps a repeated header when its original source band is outside the active page", () => {
    const table = createTable({ isHeader: true });
    const projection = createProjection({
      repeatedHeader: createQuireRepeatedTableHeaderState(table) ?? null
    });
    const containers = splitQuireTableLayoutContainerAcrossPages({
      box: {
        id: "header-table",
        range: table.tableRange,
        rect: table.rect,
        table,
        children: [createCellBox(table.cells[0]!, [createFragment({
          id: "repeated-line",
          range: { from: 2, to: 8 },
          rect: { x: 0, y: 14, width: 40, height: 10 }
        })])]
      },
      sourceTable: table,
      projections: [{
        ...projection,
        page: {
          ...projection.page,
          sourceFlowY: 100,
          range: { from: 30, to: 50 }
        },
        dy: 100
      }]
    });

    expect(containers).toHaveLength(1);
    expect(containers[0]?.table?.rows).toHaveLength(1);
    expect(containers[0]?.table?.rows[0]?.id).toContain("repeat");
    expect(containers[0]?.subLayoutFragments?.[0]?.subLayout.view.fragmentSources[0]
      ?.sourceBox.id).toBe("cell-a:repeat-p0");
  });

  it("preserves cell child fragment provenance on the split table container", () => {
    const table = createTable();
    const cell = table.cells[0]!;
    const [container] = splitQuireTableLayoutContainerAcrossPages({
      box: {
        id: "table-layout",
        range: { from: 1, to: 10 },
        rect: { x: 0, y: 10, width: 80, height: 20 },
        table,
        children: [
          createCellBox(cell, [
            createFragment({
              id: "cell-line",
              range: { from: 2, to: 8 },
              rect: { x: 0, y: 14, width: 40, height: 10 }
            })
          ])
        ]
      },
      sourceTable: table,
      projections: [createProjection()]
    });
    const splitContainer = container as QuireSplitTableLayoutContainer | undefined;
    const [childFragment] = splitContainer?.subLayoutFragments ?? [];

    expect(splitContainer?.children).toHaveLength(0);
    expect(childFragment?.subLayout.geometry.fragments[0]?.sourceId)
      .toBe("cell-a");
    expect(childFragment?.subLayout.geometry.acceptedBand).toEqual({
      top: 12,
      bottom: 28
    });
    expect(childFragment?.subLayout.view.fragmentSources[0]?.sourceBox.id)
      .toBe("cell-a");
    expect(childFragment?.subLayout.view.fragmentSources[0]?.sourceBox.rect).toEqual({
      x: 100,
      y: 212,
      width: 80,
      height: 16
    });
  });

  it("retains repeated-header child fragment provenance on the split table container", () => {
    const table = createTable({ isHeader: true });
    const cell = table.cells[0]!;
    const [container] = splitQuireTableLayoutContainerAcrossPages({
      box: {
        id: "table-layout",
        range: { from: 1, to: 10 },
        rect: { x: 0, y: 10, width: 80, height: 20 },
        table,
        children: [
          createCellBox(cell, [
            createFragment({
              id: "header-line",
              range: { from: 2, to: 8 },
              rect: { x: 0, y: 14, width: 40, height: 10 }
            })
          ])
        ]
      },
      sourceTable: table,
      projections: [createProjection({
        repeatedHeader: createQuireRepeatedTableHeaderState(table) ?? null
      })]
    });
    const splitContainer = container as QuireSplitTableLayoutContainer | undefined;
    const headerFragment = splitContainer?.subLayoutFragments?.find(
      (fragment) =>
        fragment.subLayout.view.fragmentSources[0]?.sourceBox.id ===
          "cell-a:repeat-p0"
    );
    const projected =
      headerFragment?.subLayout.view.fragmentSources[0]?.sourceBox;

    expect(headerFragment?.subLayout.geometry.fragments[0]?.sourceId)
      .toBe("cell-a");
    expect(headerFragment?.subLayout.geometry.acceptedBand).toEqual({
      top: 12,
      bottom: 28
    });
    expect(projected?.id).toBe("cell-a:repeat-p0");
    expect(splitContainer?.children).not.toContain(projected);
  });

  it("keeps table shell non-cell children out of split table content", () => {
    const table = createTable();
    const cell = table.cells[0]!;
    const [container] = splitQuireTableLayoutContainerAcrossPages({
      box: {
        id: "table-layout",
        range: { from: 1, to: 18 },
        rect: { x: 0, y: 10, width: 80, height: 30 },
        table,
        children: [
          createCellBox(cell, [
            createFragment({
              id: "cell-line",
              range: { from: 2, to: 8 },
              rect: { x: 0, y: 14, width: 40, height: 10 }
            })
          ]),
          {
            id: "table-caption",
            range: { from: 12, to: 18 },
            rect: { x: 0, y: 32, width: 70, height: 10 },
            textFragments: [
              createFragment({
                id: "caption-line",
                range: { from: 12, to: 18 },
                rect: { x: 0, y: 32, width: 70, height: 10 }
              })
            ]
          }
        ]
      },
      sourceTable: table,
      projections: [createProjection()]
    });
    const splitContainer = container as QuireSplitTableLayoutContainer | undefined;

    expect(splitContainer?.subLayoutFragments?.map((fragment) =>
      fragment.subLayout.geometry.fragments[0]?.sourceId
    )).toEqual(["cell-a"]);
    expect(splitContainer?.children.map((child) => child.id)).toEqual([]);
    expect(splitContainer?.textFragments).toBeUndefined();
  });
});

/**
 * Creates a source table fixture.
 *
 * @param options - Optional table source flags.
 * @returns Table layout snapshot with one row and one cell.
 */
function createTable(
  options: {
    /** Whether the single row is a repeated-header source row. */
    readonly isHeader?: boolean | undefined;
  } = {}
): QuireTableLayoutSnapshot {
  const row = createRow({ isHeader: options.isHeader ?? false });
  const cell = createCell();

  return {
    tableId: "table",
    fragmentId: "table",
    geometryId: "table",
    tableRange: { from: 1, to: 10 },
    style: {
      backgroundColor: null,
      borderColor: "#cbd5e1",
      borderWidth: 1
    },
    borders: null,
    rect: { x: 0, y: 10, width: 80, height: 20 },
    tracks: [],
    rows: [row],
    cells: [cell],
    hitTargets: []
  };
}

/**
 * Creates a source row fixture.
 *
 * @param options - Header-row flags for the fixture.
 * @returns Table row fragment.
 */
function createRow(options: {
  /** Whether the row is a table header source row. */
  readonly isHeader: boolean;
}): QuireTableRowFragment {
  return {
    id: "row-0",
    sourceRowId: "row:r0",
    rowIndex: 0,
    isHeader: options.isHeader,
    cantSplit: false,
    range: { from: 1, to: 10 },
    rect: { x: 0, y: 10, width: 80, height: 20 }
  };
}

/**
 * Creates a source cell fixture.
 *
 * @returns Table cell fragment.
 */
function createCell(): QuireTableCellFragment {
  return {
    id: "cell-a",
    semanticCellId: "semantic-a",
    originExplicitCellId: "cell-a",
    explicitCellIds: ["cell-a"],
    originCellPos: 1,
    range: { from: 1, to: 10 },
    shading: null,
    borders: null,
    cellMargins: null,
    gridRect: { startRow: 0, rowSpan: 1, startColumn: 0, columnSpan: 1 },
    rect: { x: 0, y: 10, width: 80, height: 20 },
    contentRect: { x: 0, y: 12, width: 80, height: 16 },
    contentChildren: []
  };
}

/**
 * Creates a source cell child layout box.
 *
 * @param cell - Source table cell that owns the child flow.
 * @param fragments - Text fragments inside the source cell child.
 * @returns Source layout container for a table cell.
 */
function createCellBox(
  cell: QuireTableCellFragment,
  fragments: readonly QuireTextFragment[]
): QuireLayoutContainer {
  return retainQuireTestTableCellSubLayoutIdentity({
    id: cell.id,
    range: cell.range,
    rect: cell.contentRect,
    textFragments: fragments
  }, cell) as QuireLayoutContainer;
}

/**
 * Creates a source text fragment fixture.
 *
 * @param options - Fragment id, source range, and rectangle.
 * @returns Text fragment fixture.
 */
function createFragment(options: {
  /** Stable fragment id. */
  readonly id: string;
  /** Source document range represented by the fragment. */
  readonly range: QuireTextFragment["range"];
  /** Source-flow fragment rectangle. */
  readonly rect: QuireTextFragment["rect"];
}): QuireTextFragment {
  return {
    id: options.id,
    text: "fallback",
    range: options.range,
    rect: options.rect,
    font: "12px test",
    lineHeight: options.rect.height,
    baseline: options.rect.y + options.rect.height,
    caretStops: []
  };
}

/**
 * Creates a page-body projection fixture.
 *
 * @param options - Optional repeated-header state for the page end info.
 * @returns Page-body projection covering the source table.
 */
function createProjection(
  options: {
    /** Repeated table-header state carried by the page end info. */
    readonly repeatedHeader?: ReturnType<typeof createQuireRepeatedTableHeaderState> | null;
  } = {}
): QuirePageBodyProjection {
  return {
    page: {
      pageIndex: 0,
      range: { from: 1, to: 25 },
      pageRect: { x: 0, y: 200, width: 300, height: 120 },
      bodyRect: { x: 100, y: 200, width: 160, height: 100 },
      rect: { x: 100, y: 200, width: 160, height: 100 },
      sourceFlowY: 0,
      sourceFlowHeight: 100,
      endInfo: options.repeatedHeader === undefined || options.repeatedHeader === null
        ? { openMarks: [], openNodes: [] }
        : {
            openMarks: [],
            openNodes: [],
            continuationState: createQuireRepeatedTableHeaderPageLeadingBand(
              options.repeatedHeader
            ).continuationState
          }
    },
    dx: 100,
    dy: 200
  };
}
