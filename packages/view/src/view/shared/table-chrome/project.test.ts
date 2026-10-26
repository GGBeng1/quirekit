import { describe, expect, it } from "vitest";
import {
  createViewCoordinateAuthority,
  type QuireTableChromeAnchor,
  type QuireTableChromeModel
} from "@quirekit/view-engine";
import { projectMountedTableChromeModel } from "./project";

describe("mounted Table chrome projection", () => {
  it("projects every fragment affordance through one surface authority", () => {
    const model = createTableChromeModel();
    const authority = createViewCoordinateAuthority({
      surfaceClientRect: { left: 100, top: 200, width: 1_000, height: 1_600 },
      surfaceBounds: { x: 20, y: 40, width: 500, height: 800 }
    });

    const projected = projectMountedTableChromeModel(model, authority);
    const fragment = projected.fragments[0];
    if (fragment === undefined) {
      throw new RangeError("Expected the projected Table fragment");
    }

    expect(fragment.tableRect).toEqual({
      left: 140,
      right: 540,
      top: 280,
      bottom: 520
    });
    expect(fragment.guides[0]).toEqual({
      id: "guide-0",
      orientation: "horizontal",
      rect: { left: 140, right: 540, top: 360, bottom: 360 }
    });
    expect(fragment.corner.rect).toEqual(fragment.tableRect);
    expect(fragment.rows[0]?.rect).toEqual({
      left: 140,
      right: 540,
      top: 280,
      bottom: 360
    });
    expect(fragment.columns[1]?.rect).toEqual({
      left: 340,
      right: 540,
      top: 280,
      bottom: 520
    });
    expect(fragment.insertions.map((anchor) => anchor.rect)).toEqual([
      { left: 140, right: 140, top: 520, bottom: 520 },
      { left: 540, right: 540, top: 280, bottom: 280 }
    ]);
    expect(fragment.resizes.map((anchor) => anchor.rect)).toEqual([
      { left: 140, right: 540, top: 520, bottom: 520 },
      { left: 540, right: 540, top: 280, bottom: 520 }
    ]);
    expect(projected.activeFragmentId).toBe("table-1:page-2");
    expect(projected.sizing).toBe(model.sizing);
    expect(projected.sizing?.columnWidths).toEqual([100, 100]);
  });
});

/**
 * Creates a complete headless Table chrome fixture in document space.
 *
 * @returns Table chrome whose anchors exercise all projection branches.
 */
function createTableChromeModel(): QuireTableChromeModel {
  const tableRect = { x: 40, y: 80, width: 200, height: 120 };
  return {
    sizing: { width: 200, columnWidths: [100, 100], rowHeights: [40, 80], cellMinimumHeights: [] },
    tableId: "table-1",
    tablePos: 12,
    activeFragmentId: "table-1:page-2",
    fragments: [{
      fragmentId: "table-1:page-2",
      tableRect,
      guides: [{
        id: "guide-0",
        orientation: "horizontal",
        rect: { x: 40, y: 120, width: 200, height: 0 }
      }],
      corner: createAnchor("corner", "table-corner", tableRect),
      rows: [
        createAnchor(
          "row-0",
          "row-bar",
          { x: 40, y: 80, width: 200, height: 40 }
        )
      ],
      columns: [
        createAnchor(
          "column-0",
          "column-bar",
          { x: 40, y: 80, width: 100, height: 120 }
        ),
        createAnchor(
          "column-1",
          "column-bar",
          { x: 140, y: 80, width: 100, height: 120 }
        )
      ],
      insertions: [
        createAnchor(
          "insert-row",
          "insert-row",
          { x: 40, y: 200, width: 0, height: 0 }
        ),
        createAnchor(
          "insert-column",
          "insert-column",
          { x: 240, y: 80, width: 0, height: 0 }
        )
      ],
      resizes: [
        createAnchor(
          "resize-row",
          "resize-row",
          { x: 40, y: 200, width: 200, height: 0 }
        ),
        createAnchor(
          "resize-column",
          "resize-column",
          { x: 240, y: 80, width: 0, height: 120 }
        )
      ],
      menu: createAnchor("menu", "menu", tableRect)
    }],
    selection: null,
    resizeSession: null
  };
}

/**
 * Creates one document-space Table chrome anchor.
 *
 * @param id - Stable fixture identity.
 * @param kind - Semantic affordance kind.
 * @param rect - Document-space anchor rectangle.
 * @returns Complete Table chrome anchor.
 */
function createAnchor(
  id: string,
  kind: QuireTableChromeAnchor["kind"],
  rect: QuireTableChromeAnchor["rect"]
): QuireTableChromeAnchor {
  return {
    id,
    kind,
    rect,
    tablePos: 12,
    semanticCellIds: ["cell-1"]
  };
}
