import { describe, expect, it } from "vitest";
import type {
  QuireLayoutBox,
  QuireLayoutContainer
} from "../../../types";
import type { QuirePageFragment } from "@quirekit/layout/pagination";
import type { QuireTableLayoutSnapshot } from "../../../table";
import { createQuireRepeatedTableHeaderPageLeadingBand } from "../../repeated-table-headers";
import { createQuirePageBodyProjections } from "./create";

describe("canvas page body projection creation", () => {
  it("uses measured source-flow coordinates and sourceX as the projection anchor", () => {
    const [projection] = createQuirePageBodyProjections(
      [
        createBox({
          id: "paragraph",
          range: { from: 1, to: 10 },
          x: 240,
          y: 120
        })
      ],
      [
        createPage({
          sourceFlowY: 120,
          sourceFlowHeight: 48,
          bodyX: 40,
          bodyY: 50
        })
      ],
      100
    );

    expect(projection).toMatchObject({ dx: -60, dy: -70 });
  });

  it("does not create projections for page records without measured source-flow bands", () => {
    const projections = createQuirePageBodyProjections(
      [
        createBox({
          id: "paragraph",
          range: { from: 1, to: 20 },
          x: 240,
          y: 120
        })
      ],
      [
        createPage({
          bodyX: 40,
          bodyY: 50
        })
      ],
      100
    );

    expect(projections).toEqual([]);
  });

  it("reserves repeated table header height before measured body content", () => {
    const [projection] = createQuirePageBodyProjections(
      [
        createContainer({
          id: "section",
          range: { from: 1, to: 20 },
          children: [
            {
              ...createBox({
                id: "table-box",
                range: { from: 1, to: 20 },
                x: 140,
                y: 300
              }),
              table: createTableSnapshot("table")
            }
          ]
        })
      ],
      [
        createPage({
          sourceFlowY: 300,
          sourceFlowHeight: 72,
          bodyX: 40,
          bodyY: 50,
          endInfo: {
            openMarks: [],
            openNodes: [],
            continuationState: createQuireRepeatedTableHeaderPageLeadingBand({
              tableId: "table",
              rowIndexes: [0],
              rows: [
                {
                  rowIndex: 0,
                  sourceRowId: "row:r0",
                  range: { from: 1, to: 20 },
                  height: 18
                }
              ],
              height: 18
            }).continuationState
          }
        })
      ],
      100
    );

    expect(projection).toMatchObject({ dx: -60, dy: -232 });
  });

  it("does not scan layout boxes for repeated headers when page state has none", () => {
    const box = createBox({
      id: "paragraph",
      range: { from: 1, to: 20 },
      x: 240,
      y: 120
    });
    Object.defineProperty(box, "table", {
      enumerable: true,
      configurable: true,
      get: () => {
        throw new Error("table lookup should stay skipped");
      }
    });
    Object.defineProperty(box, "children", {
      enumerable: true,
      configurable: true,
      get: () => {
        throw new Error("child scan should stay skipped");
      }
    });

    const [projection] = createQuirePageBodyProjections(
      [box],
      [
        createPage({
          sourceFlowY: 120,
          sourceFlowHeight: 48,
          bodyX: 40,
          bodyY: 50
        })
      ],
      100
    );

    expect(projection).toMatchObject({ dx: -60, dy: -70 });
  });

  it("creates projections only for pages inside the active clip", () => {
    const projections = createQuirePageBodyProjections(
      [
        createBox({
          id: "paragraph",
          range: { from: 1, to: 20 },
          x: 240,
          y: 120
        })
      ],
      [
        createPage({
          pageIndex: 0,
          pageY: 0,
          sourceFlowY: 120,
          sourceFlowHeight: 48,
          bodyX: 40,
          bodyY: 50
        }),
        createPage({
          pageIndex: 1,
          pageY: 400,
          sourceFlowY: 120,
          sourceFlowHeight: 48,
          bodyX: 40,
          bodyY: 450
        })
      ],
      100,
      [{ x: 0, y: 400, width: 400, height: 400 }]
    );

    expect(projections.map((projection) => projection.page.pageIndex)).toEqual([1]);
  });
});

/**
 * Creates a layout box fixture.
 *
 * @param options - Box id, document range, and source-flow origin.
 * @returns Layout box fixture.
 */
function createBox(options: {
  /** Stable box id. */
  readonly id: string;
  /** Document range represented by the box. */
  readonly range: QuireLayoutBox["range"];
  /** Source-flow x coordinate. */
  readonly x: number;
  /** Source-flow y coordinate. */
  readonly y: number;
}): QuireLayoutBox {
  return {
    id: options.id,
    range: options.range,
    rect: { x: options.x, y: options.y, width: 120, height: 48 }
  };
}

/**
 * Creates a layout container fixture.
 *
 * @param options - Container id, range, and children.
 * @returns Layout container fixture.
 */
function createContainer(options: {
  /** Stable container id. */
  readonly id: string;
  /** Document range represented by the container. */
  readonly range: QuireLayoutContainer["range"];
  /** Child layout boxes. */
  readonly children: readonly QuireLayoutBox[];
}): QuireLayoutContainer {
  return {
    id: options.id,
    range: options.range,
    rect: { x: 100, y: 280, width: 220, height: 120 },
    children: options.children
  };
}

/**
 * Creates a page fragment fixture.
 *
 * @param options - Source-flow band, body origin, and optional end info.
 * @returns Page fragment fixture.
 */
function createPage(options: {
  /** Optional page index represented by the fixture. */
  readonly pageIndex?: number | undefined;
  /** Optional page top coordinate represented by the fixture. */
  readonly pageY?: number | undefined;
  /** Optional source-flow y coordinate aligned to this page body. */
  readonly sourceFlowY?: number | undefined;
  /** Optional source-flow height accepted by this page body. */
  readonly sourceFlowHeight?: number | undefined;
  /** Page body x coordinate. */
  readonly bodyX: number;
  /** Page body y coordinate. */
  readonly bodyY: number;
  /** Optional page end-info payload. */
  readonly endInfo?: QuirePageFragment["endInfo"] | undefined;
}): QuirePageFragment {
  return {
    pageIndex: options.pageIndex ?? 1,
    range: { from: 1, to: 20 },
    pageRect: { x: 0, y: options.pageY ?? 0, width: 400, height: 400 },
    bodyRect: {
      x: options.bodyX,
      y: options.bodyY,
      width: 320,
      height: 240
    },
    rect: {
      x: options.bodyX,
      y: options.bodyY,
      width: 320,
      height: 240
    },
    sourceFlowY: options.sourceFlowY,
    sourceFlowHeight: options.sourceFlowHeight,
    endInfo: options.endInfo ?? { openMarks: [], openNodes: [] }
  };
}

/**
 * Creates a minimal table snapshot fixture.
 *
 * @param tableId - Stable table id.
 * @returns Table layout snapshot fixture.
 */
function createTableSnapshot(tableId: string): QuireTableLayoutSnapshot {
  return {
    tableId,
    fragmentId: tableId,
    geometryId: tableId,
    tableRange: { from: 1, to: 20 },
    style: {} as QuireTableLayoutSnapshot["style"],
    borders: null,
    rect: { x: 140, y: 300, width: 120, height: 80 },
    tracks: [],
    rows: [],
    cells: [],
    hitTargets: []
  };
}
