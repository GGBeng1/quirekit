import type { QuireRect } from "@quirekit/renderer";
import type { QuireChildFlowTransform } from "@quirekit/layout/child-flow";
import {
  createQuireProjectedTableCellSubLayoutProjection,
  type QuireTableCellSubLayoutRoot
} from "../../../table/sub-layout";
import type { QuireSubLayoutProjection } from "../../../sub-layout";
import type { QuireLayoutBox } from "../../../types";
import type { QuireSourceFlowClip } from "../source-flow";
import { projectQuireSubLayoutProjectionVisualInstance } from "../sub-layout-visual-instance";
import { retainQuireTableCellDescendantProducts } from "./retained-products";

/** Options for creating a body table-cell sub-layout projection. */
export interface CreateQuireTableBodyCellSubLayoutProjectionOptions {
  /** Geometry and View root products that own the projected child flow. */
  readonly root: QuireTableCellSubLayoutRoot;
  /** Source child layout box id represented by the result. */
  readonly sourceChildId: string;
  /** Source-flow band accepted into the page-local cell fragment. */
  readonly sourceFlowClip: QuireSourceFlowClip;
  /** Source-flow rectangle accepted into the page-local cell fragment. */
  readonly sourceRectClip: QuireRect;
  /** Page-local child boxes projected into the accepted cell fragment. */
  readonly children: readonly QuireLayoutBox[];
  /** Page index that owns the body cell fragment. */
  readonly pageIndex: number;
  /** Optional table-adapter state retained without generic interpretation. */
  readonly adapterState?: Readonly<Record<string, unknown>> | undefined;
}

/**
 * Creates the sub-layout projection for a projected body table-cell slice.
 *
 * @param options - Root, accepted source-flow clip, and projected child boxes.
 * @returns Canonical child-flow geometry with its View-owned projection products.
 */
export function createQuireTableBodyCellSubLayoutProjection(
  options: CreateQuireTableBodyCellSubLayoutProjectionOptions
): QuireSubLayoutProjection {
  const localToResult = createQuireTableBodyCellLocalToResultTransform(
    options.root.geometry,
    options.sourceRectClip
  );

  const projection = projectQuireSubLayoutProjectionVisualInstance(
    createQuireProjectedTableCellSubLayoutProjection({
      root: options.root,
      sourceChildId: options.sourceChildId,
      acceptedBand: options.sourceFlowClip,
      children: options.children,
      localToResult,
      contentClip: options.root.geometry.placement.contentRect,
      interactionClip: options.root.geometry.placement.clipRect ??
        options.root.geometry.placement.contentRect,
      pageIndex: options.pageIndex,
      parentFragmentId: options.root.geometry.placement.parentId,
      adapterState: options.adapterState
    }),
    {
      sourceClip: options.sourceRectClip,
      translation: { dx: localToResult.x, dy: localToResult.y }
    }
  );
  return retainQuireTableCellDescendantProducts(projection, options.children);
}

/**
 * Resolves the accepted slice transform from local source-flow to parent space.
 *
 * @param root - Sub-layout root placed by the table-cell fragment.
 * @param sourceRectClip - Source-flow rectangle accepted by this result.
 * @returns Local-to-parent transform for the accepted source rectangle.
 */
function createQuireTableBodyCellLocalToResultTransform(
  root: QuireTableCellSubLayoutRoot["geometry"],
  sourceRectClip: QuireRect
): QuireChildFlowTransform {
  return {
    x: root.placement.contentRect.x - sourceRectClip.x,
    y: root.placement.contentRect.y - sourceRectClip.y
  };
}
