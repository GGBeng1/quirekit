import { describe, expect, it } from "vitest";
import type { QuireLayoutBox, QuireLayoutContainer } from "../../types";
import type { QuireTableCellFragment } from "../types";
import { retainQuireTestTableCellSubLayoutIdentity } from "../../../../../test-support/layout/table-cell-sub-layout";
import {
  createQuireTableCellSubLayoutRoot,
  createQuireTableCellSubLayoutRootMap
} from "./root";

describe("table-cell sub-layout root adapter", () => {
  it("maps table-cell child flow into the generic sub-layout root contract", () => {
    const cell = createCell();
    const childFlowBox = createChildFlowBox();
    const retainedProjection = childFlowBox.subLayoutFragments![0]!.subLayout;
    const retainedRoot = {
      geometry: retainedProjection.geometry.root,
      view: retainedProjection.view.root
    };

    const root = createQuireTableCellSubLayoutRoot({
      cell,
      childFlowBox,
      retainedRoot,
      parentId: "row-0",
      dependencySignature: "cell-width:80|style:v1"
    });

    expect(root.geometry).toEqual({
      id: "test-table-cell:semantic-a",
      kind: "table-cell",
      range: cell.range,
      placement: {
        parentId: "row-0",
        rect: cell.rect,
        contentRect: cell.contentRect,
        clipRect: cell.contentLayoutRect
      },
      localRect: childFlowBox.inlineLayoutRect,
      writingMode: "horizontal-tb",
      dependencySignature: "cell-width:80|style:v1",
      metadata: {
        tableCell: {
          cellId: "cell-a",
          semanticCellId: "semantic-a",
          originExplicitCellId: "explicit-a",
          explicitCellIds: ["explicit-a"],
          originCellPos: 4,
          gridRect: { startRow: 0, startColumn: 0, rowSpan: 1, columnSpan: 1 }
        }
      }
    });
    expect(root.view).toEqual({
      ownership: retainedRoot.view.ownership,
      sourceBox: childFlowBox
    });
  });

  it("keeps provider-owned root identity stable across visual fragments", () => {
    const first = createCell({ id: "cell-a-page-0" });
    const second = createCell({ id: "cell-a-page-1" });
    const retainedProjection = createChildFlowBox()
      .subLayoutFragments![0]!.subLayout;
    const retainedRoot = {
      geometry: retainedProjection.geometry.root,
      view: retainedProjection.view.root
    };

    expect(createQuireTableCellSubLayoutRoot({
      cell: first,
      childFlowBox: createChildFlowBox(),
      retainedRoot,
      parentId: "page-0",
      dependencySignature: "page-0"
    }).geometry.id).toBe(createQuireTableCellSubLayoutRoot({
      cell: second,
      childFlowBox: createChildFlowBox(),
      retainedRoot,
      parentId: "page-1",
      dependencySignature: "page-1"
    }).geometry.id);
  });

  it("creates root-map entries for cells with measured child flow", () => {
    const cell = createCell();
    const childFlowBox = createChildFlowBox("cell-a");
    const rootByCellId = createQuireTableCellSubLayoutRootMap({
      cells: [cell, createCell({ id: "cell-b" })],
      children: [createContainer("table-wrapper", [childFlowBox])],
      parentId: "table-0",
      dependencySignaturePrefix: "measure"
    });

    expect(rootByCellId.has("cell-b")).toBe(false);
    expect(rootByCellId.get("cell-a")?.geometry).toMatchObject({
      id: "test-table-cell:semantic-a",
      kind: "table-cell",
      range: cell.range,
      dependencySignature: "measure|table-0|cell-a|cell-a|20|30|80|40|0|0|80|40"
    });
    expect(rootByCellId.get("cell-a")?.view.sourceBox).toBe(childFlowBox);
  });

  it("keeps root-map entries keyed by fragment id when source ids differ", () => {
    const cell = createCell({ id: "cell-a#p1" });
    const childFlowBox = createChildFlowBox("cell-a");
    const rootByCellId = createQuireTableCellSubLayoutRootMap({
      cells: [cell],
      children: [createContainer("table-wrapper", [childFlowBox])],
      parentId: "table-0#p1",
      dependencySignaturePrefix: "measure",
      resolveSourceCellId: () => "cell-a"
    });

    expect(rootByCellId.has("cell-a")).toBe(false);
    expect(rootByCellId.get("cell-a#p1")?.geometry).toMatchObject({
      dependencySignature: "measure|table-0#p1|cell-a#p1|cell-a|20|30|80|40|0|0|80|40"
    });
    expect(rootByCellId.get("cell-a#p1")?.view.sourceBox).toBe(childFlowBox);
  });

  it("keeps the first measured owner when descendants repeat a source id", () => {
    const cell = createCell();
    const repeatedDescendant = createChildFlowBox("cell-a");
    const owner = retainQuireTestTableCellSubLayoutIdentity(
      createContainer("cell-a", [repeatedDescendant]),
      cell
    );
    const rootByCellId = createQuireTableCellSubLayoutRootMap({
      cells: [cell],
      children: [owner],
      parentId: "table-0"
    });

    expect(rootByCellId.get("cell-a")?.view.sourceBox).toBe(owner);
  });
});

/**
 * Creates a projected table-cell fragment fixture.
 *
 * @param overrides - Optional cell field overrides.
 * @returns Table-cell fragment fixture.
 */
function createCell(
  overrides: Partial<QuireTableCellFragment> = {}
): QuireTableCellFragment {
  return {
    id: "cell-a",
    semanticCellId: "semantic-a",
    originExplicitCellId: "explicit-a",
    explicitCellIds: ["explicit-a"],
    originCellPos: 4,
    gridRect: { startRow: 0, startColumn: 0, rowSpan: 1, columnSpan: 1 },
    range: { from: 4, to: 12 },
    shading: null,
    borders: null,
    cellMargins: null,
    rect: { x: 10, y: 20, width: 100, height: 60 },
    contentRect: { x: 20, y: 30, width: 80, height: 40 },
    contentLayoutRect: { x: 20, y: 30, width: 80, height: 40 },
    verticalAlign: "top",
    contentChildren: [],
    ...overrides
  };
}

/**
 * Creates a measured child-flow layout box fixture.
 *
 * @returns Child-flow layout box fixture.
 */
function createChildFlowBox(id = "cell-a-content"): QuireLayoutBox {
  const range = { from: 5, to: 11 };
  return retainQuireTestTableCellSubLayoutIdentity({
    id,
    range,
    rect: { x: 0, y: 0, width: 80, height: 40 },
    inlineLayoutRect: { x: 0, y: 0, width: 80, height: 40 },
    textFragments: []
  }, createCell({ range })) as QuireLayoutBox;
}

/**
 * Creates a layout-container fixture.
 *
 * @param id - Stable container id.
 * @param children - Child boxes owned by the container.
 * @returns Layout-container fixture.
 */
function createContainer(
  id: string,
  children: readonly QuireLayoutBox[]
): QuireLayoutContainer {
  return {
    id,
    range: { from: 1, to: 20 },
    rect: { x: 0, y: 0, width: 100, height: 80 },
    children
  };
}
