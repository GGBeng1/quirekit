import {
  createQuireChildFlowContinuation,
  createQuireChildFlowResult,
  type QuireChildFlowFragment,
  type QuireChildFlowSourceBand,
  type QuireChildFlowTransform
} from "@quirekit/layout/child-flow";
import type { QuireRect } from "@quirekit/renderer";
import {
  createQuireSubLayoutProjection,
  createQuireSubLayoutQueryProducts,
  type QuireSubLayoutFragmentSource,
  type QuireSubLayoutProjection
} from "../../sub-layout";
import type { QuireLayoutBox } from "../../types";
import type { QuireTableCellSubLayoutRoot } from "./types";

/** Options for creating a projected table-cell child-flow projection. */
export interface CreateQuireProjectedTableCellSubLayoutProjectionOptions {
  /** Geometry and View sidecar that own the table-cell child flow. */
  readonly root: QuireTableCellSubLayoutRoot;
  /** Source child layout box id represented by the result. */
  readonly sourceChildId: string;
  /** Source-flow band accepted into the projected cell fragment. */
  readonly acceptedBand: QuireChildFlowSourceBand;
  /** Page-local child boxes projected into the accepted cell fragment. */
  readonly children: readonly QuireLayoutBox[];
  /** Translation from root-local coordinates to result coordinates. */
  readonly localToResult: QuireChildFlowTransform;
  /** Page-local content clip for this result. */
  readonly contentClip: QuireRect;
  /** Page-local interaction clip for hit testing and trailing blank hits. */
  readonly interactionClip?: QuireRect | undefined;
  /** Optional page index that owns this projected result. */
  readonly pageIndex?: number | undefined;
  /** Optional parent fragment id that owns this projected result. */
  readonly parentFragmentId?: string | undefined;
  /** Optional adapter-owned continuation state kept opaque to generic fragmentation. */
  readonly adapterState?: Readonly<Record<string, unknown>> | undefined;
}

/**
 * Creates one page-local table-cell child-flow projection.
 *
 * Canonical geometry is created before any query or source products. The View
 * sidecar then attaches page-local boxes and queries to the exact result id.
 *
 * @param options - Root, accepted source band, page children, and clips.
 * @returns Consumer-neutral geometry with its View projection.
 */
export function createQuireProjectedTableCellSubLayoutProjection(
  options: CreateQuireProjectedTableCellSubLayoutProjectionOptions
): QuireSubLayoutProjection {
  const interactionClip = options.interactionClip ?? options.contentClip;
  const id = createQuireProjectedTableCellSubLayoutProjectionId(
    options.root,
    options.acceptedBand
  );
  const fragments = createQuireProjectedTableCellSubLayoutChildFragments(
    options.children,
    options.sourceChildId,
    options.localToResult
  );
  const fragmentSources = createProjectedFragmentSources(
    fragments,
    options.children
  );
  const parentFragmentId = options.parentFragmentId
    ?? options.root.geometry.placement.parentId;
  const geometry = createQuireChildFlowResult({
    id,
    trackId: parentFragmentId,
    root: options.root.geometry,
    acceptedBand: options.acceptedBand,
    fragments,
    localToResult: options.localToResult,
    coordinateSpace: "document",
    contentClip: options.contentClip,
    interactionClip,
    continuation: createQuireChildFlowContinuation({
      root: options.root.geometry,
      acceptedBand: options.acceptedBand,
      previousResultId: id,
      ...(options.pageIndex === undefined ? {} : { pageIndex: options.pageIndex }),
      parentFragmentId,
      adapterState: createQuireProjectedTableCellContinuationAdapterState(options)
    }),
    dependencySignature: options.root.geometry.dependencySignature
  });

  return createQuireSubLayoutProjection({
    geometry,
    root: options.root.view,
    fragmentSources,
    queryProducts: createQuireSubLayoutQueryProducts(
      fragments,
      interactionClip,
      fragmentSources
    )
  });
}

/**
 * Creates canonical fragments accepted by a projected table-cell result.
 *
 * @param children - Page-local child boxes accepted into the cell fragment.
 * @param sourceChildId - Source child layout box id represented by the result.
 * @param localToResult - Root-local to result-space translation.
 * @returns Accepted geometry fragments in source order.
 */
export function createQuireProjectedTableCellSubLayoutChildFragments(
  children: readonly QuireLayoutBox[],
  sourceChildId: string,
  localToResult: QuireChildFlowTransform
): readonly QuireChildFlowFragment[] {
  return children.map((child) => ({
    id: child.id,
    sourceId: sourceChildId,
    range: child.range,
    rect: child.rect,
    localRect: translateQuireProjectedTableCellRectToLocal(
      child.rect,
      localToResult
    ),
    ...(child.textFragments === undefined
      ? {}
      : { textFragments: child.textFragments })
  }));
}

/**
 * Creates a stable page-local result id for a table-cell projection.
 *
 * @param root - Table-cell root that owns the result.
 * @param acceptedBand - Source-flow band accepted by the result.
 * @returns Stable result id.
 */
export function createQuireProjectedTableCellSubLayoutProjectionId(
  root: QuireTableCellSubLayoutRoot,
  acceptedBand: QuireChildFlowSourceBand
): string {
  return [
    root.geometry.id,
    root.geometry.placement.parentId,
    `source-flow:${acceptedBand.top}-${acceptedBand.bottom}`
  ].join(":");
}

/**
 * Attaches page-local boxes to canonical fragment identities.
 *
 * @param fragments - Canonical page-local fragments.
 * @param children - Page-local source boxes in matching order.
 * @returns View source provenance keyed by fragment id.
 */
function createProjectedFragmentSources(
  fragments: readonly QuireChildFlowFragment[],
  children: readonly QuireLayoutBox[]
): readonly QuireSubLayoutFragmentSource[] {
  return fragments.flatMap((fragment, index) => {
    const sourceBox = children[index];
    return sourceBox === undefined ? [] : [{ fragmentId: fragment.id, sourceBox }];
  });
}

/**
 * Translates one result-space rectangle into root-local coordinates.
 *
 * @param rect - Result-space rectangle.
 * @param localToResult - Root-local to result-space translation.
 * @returns Root-local rectangle.
 */
function translateQuireProjectedTableCellRectToLocal(
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
 * Creates opaque adapter state for projected table-cell continuations.
 *
 * @param options - Projected table-cell result options.
 * @returns Adapter-owned continuation state.
 */
function createQuireProjectedTableCellContinuationAdapterState(
  options: CreateQuireProjectedTableCellSubLayoutProjectionOptions
): Readonly<Record<string, unknown>> {
  return {
    sourceChildId: options.sourceChildId,
    ...(options.root.geometry.metadata?.tableCell === undefined
      ? {}
      : { tableCell: options.root.geometry.metadata.tableCell }),
    ...(options.adapterState === undefined
      ? {}
      : options.adapterState)
  };
}
