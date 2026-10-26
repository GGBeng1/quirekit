import {
  createQuireChildFlowResult,
  type QuireChildFlowFragment,
  type QuireChildFlowSourceBand,
  type QuireChildFlowTransform
} from "@quirekit/layout/child-flow";
import type { QuireRect } from "@quirekit/renderer";
import {
  createQuireSubLayoutProjection,
  type QuireSubLayoutFragmentSource,
  type QuireSubLayoutProjection,
  type QuireSubLayoutQueryProducts
} from "../../sub-layout";
import type { QuireLayoutBox } from "../../types";
import { collectQuireTableCellLayoutBoxTree } from "./source-box";
import type {
  CreateQuireTableCellSourceSubLayoutProjectionMapOptions,
  CreateQuireTableCellSourceSubLayoutProjectionOptions,
  QuireTableCellSubLayoutProjectionMap,
  QuireTableCellSubLayoutRoot
} from "./types";

/**
 * Creates a source-flow projection for a table-cell child-flow root.
 *
 * Source measurement keeps query products empty, but still records explicit
 * source provenance so later page projections never recover boxes by identity
 * guesses.
 *
 * @param options - Table-cell child-flow root to expose as a source result.
 * @returns Source-flow geometry and its View sidecar.
 */
export function createQuireTableCellSourceSubLayoutProjection(
  options: CreateQuireTableCellSourceSubLayoutProjectionOptions
): QuireSubLayoutProjection {
  const { geometry: root } = options.root;
  const localToResult = createQuireTableCellSourceLocalToResultTransform(root);
  const acceptedBand = createQuireTableCellSourceAcceptedBand(root);
  const sourceBoxes = options.root.view.sourceBox === undefined
    ? []
    : collectQuireTableCellLayoutBoxTree(options.root.view.sourceBox);
  const fragments = createQuireTableCellSourceFragments(
    sourceBoxes,
    localToResult
  );
  const id = createQuireTableCellSourceSubLayoutProjectionId(root, acceptedBand);
  const geometry = createQuireChildFlowResult({
    id,
    trackId: `${root.id}:source-track`,
    root,
    acceptedBand,
    fragments,
    localToResult,
    coordinateSpace: "document",
    contentClip: root.placement.contentRect,
    interactionClip: root.placement.clipRect ?? root.placement.contentRect,
    continuation: null,
    dependencySignature: root.dependencySignature
  });

  return createQuireSubLayoutProjection({
    geometry,
    root: options.root.view,
    fragmentSources: createFragmentSources(fragments, sourceBoxes),
    queryProducts: createEmptyQuireTableCellSourceQueryProducts()
  });
}

/**
 * Creates source-flow projections from table-cell roots.
 *
 * @param options - Table-cell roots keyed by source cell id.
 * @returns Table-cell projections keyed by source cell id.
 */
export function createQuireTableCellSourceSubLayoutProjectionMap(
  options: CreateQuireTableCellSourceSubLayoutProjectionMapOptions
): QuireTableCellSubLayoutProjectionMap {
  const resultByCellId = new Map<string, QuireSubLayoutProjection>();

  for (const [cellId, root] of options.subLayoutRootByCellId) {
    resultByCellId.set(
      cellId,
      createQuireTableCellSourceSubLayoutProjection({ root })
    );
  }

  return resultByCellId;
}

/**
 * Creates canonical source fragments for a table-cell source result.
 *
 * @param sourceBoxes - Source child-flow boxes in source order.
 * @param localToResult - Root-local to source-result translation.
 * @returns Consumer-neutral fragments in source order.
 */
function createQuireTableCellSourceFragments(
  sourceBoxes: readonly QuireLayoutBox[],
  localToResult: QuireChildFlowTransform
): readonly QuireChildFlowFragment[] {
  return sourceBoxes.map((box) => ({
    id: box.id,
    sourceId: box.id,
    range: box.range,
    rect: box.rect,
    localRect: translateQuireTableCellSourceRectToLocal(
      box.rect,
      localToResult
    ),
    ...(box.textFragments === undefined
      ? {}
      : { textFragments: box.textFragments })
  }));
}

/**
 * Attaches explicit source boxes to canonical fragment identities.
 *
 * @param fragments - Canonical source fragments.
 * @param sourceBoxes - Source boxes in matching source order.
 * @returns View source provenance keyed by fragment id.
 */
function createFragmentSources(
  fragments: readonly QuireChildFlowFragment[],
  sourceBoxes: readonly QuireLayoutBox[]
): readonly QuireSubLayoutFragmentSource[] {
  return fragments.flatMap((fragment, index) => {
    const sourceBox = sourceBoxes[index];
    return sourceBox === undefined ? [] : [{ fragmentId: fragment.id, sourceBox }];
  });
}

/**
 * Creates the accepted source-flow band for a table-cell root.
 *
 * @param root - Table-cell child-flow root to inspect.
 * @returns Source-flow band accepted by the whole source result.
 */
function createQuireTableCellSourceAcceptedBand(
  root: QuireTableCellSubLayoutRoot["geometry"]
): QuireChildFlowSourceBand {
  return {
    top: root.localRect.y,
    bottom: root.localRect.y + root.localRect.height
  };
}

/**
 * Creates a stable source-flow result id for a table-cell result.
 *
 * @param root - Table-cell root that owns the result.
 * @param acceptedBand - Source-flow band accepted by the result.
 * @returns Stable result id.
 */
function createQuireTableCellSourceSubLayoutProjectionId(
  root: QuireTableCellSubLayoutRoot["geometry"],
  acceptedBand: QuireChildFlowSourceBand
): string {
  return [
    root.id,
    root.placement.parentId,
    `source-flow:${acceptedBand.top}-${acceptedBand.bottom}`
  ].join(":");
}

/**
 * Resolves root-local coordinates into source-result coordinates.
 *
 * @param root - Table-cell root that owns the local flow.
 * @returns Root-local to source-result translation.
 */
function createQuireTableCellSourceLocalToResultTransform(
  root: QuireTableCellSubLayoutRoot["geometry"]
): QuireChildFlowTransform {
  return {
    x: root.placement.contentRect.x - root.localRect.x,
    y: root.placement.contentRect.y - root.localRect.y
  };
}

/**
 * Translates a result-space rectangle into root-local coordinates.
 *
 * @param rect - Result-space rectangle.
 * @param localToResult - Root-local to result translation.
 * @returns Root-local rectangle.
 */
function translateQuireTableCellSourceRectToLocal(
  rect: QuireRect,
  localToResult: QuireChildFlowTransform
): QuireRect {
  return {
    x: rect.x - localToResult.x,
    y: rect.y - localToResult.y,
    width: rect.width,
    height: rect.height
  };
}

/**
 * Creates empty query products for source measurement.
 *
 * @returns Empty query products until page projection attaches interaction.
 */
function createEmptyQuireTableCellSourceQueryProducts(): QuireSubLayoutQueryProducts {
  return {
    selectionRects: [],
    caretStops: [],
    hitTargets: [],
    inputAnchors: []
  };
}
