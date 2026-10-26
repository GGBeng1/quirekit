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

/** Options for creating a repeated-header table-cell sub-layout projection. */
export interface CreateQuireRepeatedHeaderCellSubLayoutProjectionOptions {
  /** Geometry and View root products that own the repeated child flow. */
  readonly root: QuireTableCellSubLayoutRoot;
  /** Source child layout box id represented by the result. */
  readonly sourceChildId: string;
  /** Source-flow band accepted into the repeated header fragment. */
  readonly sourceFlowClip: QuireSourceFlowClip;
  /** Source-flow child rectangle before repeated-header cloning. */
  readonly sourceRect: QuireRect;
  /** Page-local repeated header content clip. */
  readonly contentClip: QuireRect;
  /** Page-local child boxes cloned into the repeated header fragment. */
  readonly children: readonly QuireLayoutBox[];
}

/**
 * Creates the migration sub-layout result for a repeated header table-cell.
 *
 * @param options - Root, source-flow clip, source rectangle, and cloned children.
 * @returns Sub-layout result shaped like body table-cell child projection.
 */
export function createQuireRepeatedHeaderCellSubLayoutProjection(
  options: CreateQuireRepeatedHeaderCellSubLayoutProjectionOptions
): QuireSubLayoutProjection {
  const localToResult = createQuireRepeatedHeaderCellLocalToResultTransform(
    options
  );

  const sourceProjection = {
    sourceClip: {
      ...options.contentClip,
      x: options.contentClip.x - localToResult.x,
      y: options.contentClip.y - localToResult.y
    },
    translation: { dx: localToResult.x, dy: localToResult.y }
  };
  const projection = projectQuireSubLayoutProjectionVisualInstance(
    createQuireProjectedTableCellSubLayoutProjection({
    root: options.root,
    sourceChildId: options.sourceChildId,
    acceptedBand: options.sourceFlowClip,
    children: options.children,
    localToResult,
    contentClip: options.contentClip,
    interactionClip: options.contentClip
    }),
    sourceProjection
  );
  return retainQuireTableCellDescendantProducts(
    projection, options.children, sourceProjection
  );
}

/**
 * Resolves the repeated-header clone transform from source flow to parent space.
 *
 * @param options - Repeated-header source and clone geometry.
 * @returns Local-to-parent transform for the repeated header clone.
 */
function createQuireRepeatedHeaderCellLocalToResultTransform(
  options: CreateQuireRepeatedHeaderCellSubLayoutProjectionOptions
): QuireChildFlowTransform {
  const firstChild = options.children[0];

  if (firstChild === undefined) {
    return {
      x: options.contentClip.x - options.sourceRect.x,
      y: options.contentClip.y - options.sourceRect.y
    };
  }

  return {
    x: firstChild.rect.x - options.sourceRect.x,
    y: firstChild.rect.y - options.sourceRect.y
  };
}
