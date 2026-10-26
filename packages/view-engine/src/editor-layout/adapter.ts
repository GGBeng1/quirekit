import { doesQuireRectIntersectClip } from "../layout/geometry/clip";
import {
  normalizeQuirePositiveAreaRects,
  type QuireRect
} from "@quirekit/renderer";
import type {
  QuireLayoutNode,
  QuireLayoutSnapshotViewGraphOptions
} from "../layout/types";
import type {
  QuireLayoutSnapshot,
  QuireLayoutSnapshotAdapterOptions,
  QuireLayoutSnapshotDraft,
  QuireRetainedLayoutSnapshot
} from "./types";
import type { QuireLayoutOwnerFacts } from "@quirekit/layout/products";
import type {
  QuireHitTarget,
  QuireLayoutBox
} from "../layout/engine/types";
import {
  adaptQuireSubLayoutDisplayChunksForSnapshot,
  adaptQuireSubLayoutQueryProductsForSnapshot,
  collectQuireSubLayoutRegionProductsForSnapshot,
  readQuireSubLayoutSourceBoxesForSnapshot
} from "../layout/engine/sub-layout/snapshot";
import {
  createQuireLayoutLayerTargetIndex,
  createQuireViewTargetHitTargets,
  normalizeQuireLayoutHitTargetLayerFacts
} from "../layout/layer-targets";
import { createQuireLayoutInteractionQueryIndex } from "../layout/query-index";
import { createQuireLayoutSnapshotViewGraph } from "../layout/view-graph";
import { allocateQuireLayoutSnapshotViewGraphOptions } from "./snapshot/authority";
import {
  collectQuireLayoutRetainedRegionProducts,
  mergeQuireRetainedRegionProductSets
} from "../layout/region-products";
import type { QuireRetainedRegionProducts } from "../layout/region-products";
import { resolveQuireLayoutInteractionRole } from "./adapter-interaction-role";
import { clipLayoutTextFragments, resolveLayoutSnapshotClipRects } from "./snapshot/clipping";
import { adaptQuireLayoutPage } from "./page-adapter";
import { isQuireLayoutContainer } from "../layout/engine/pagination/projection/guards";
import { containsQuireFloatingTable } from "../layout/engine/pagination/projection/translate/floating-table";

/**
 * Adapts a renderer-neutral engine layout document to the current snapshot API.
 *
 * @param options - Engine document and mounted snapshot inputs.
 * @returns Current `QuireLayoutSnapshot` shape used by mounted views.
 */
export function adaptQuireLayoutDocumentToSnapshot(
  options: QuireLayoutSnapshotAdapterOptions
): QuireRetainedLayoutSnapshot {
  const hitTargets: QuireHitTarget[] = [];
  const snapshotClipRects = normalizeQuirePositiveAreaRects(
    options.snapshotClipRects
  );
  const root = adaptLayoutBox(
    options.document,
    snapshotClipRects,
    undefined,
    undefined,
    readSnapshotSelectionRange(options.state)
  );
  const regionProducts = mergeQuireRetainedRegionProductSets([
    collectQuireLayoutRetainedRegionProducts(root),
    options.document.anchorRegionProducts
  ])!;
  const layerContributions = regionProducts.layerContributions.filter(
    (contribution) => doesQuireRectIntersectClip(
      contribution.visualBounds ?? contribution.rect,
      snapshotClipRects
    )
  );
  const persistentLayerContributions = layerContributions.filter(
    (contribution) => contribution.activation === undefined
  );
  const placementSources = new Set(layerContributions.map(contribution => contribution.owner.source.sourceId));
  hitTargets.push(
    ...regionProducts.hitTargets
      .filter((target) => doesQuireRectIntersectClip(target.rect, snapshotClipRects))
      .map(normalizeQuireLayoutHitTargetLayerFacts)
  );
  hitTargets.unshift(
    ...options.document.hitTargets
      .filter((target) => doesQuireRectIntersectClip(target.rect, snapshotClipRects))
      .map(normalizeQuireLayoutHitTargetLayerFacts)
  );
  hitTargets.push(...persistentLayerContributions.flatMap((contribution) =>
    createQuireViewTargetHitTargets({
      idPrefix: `layer-contribution:${contribution.contributionId}`,
      targets: contribution.targets,
      fallbackRange: contribution.range,
      ...(contribution.interactionScope === undefined
        ? {}
        : { interactionScope: contribution.interactionScope }),
      viewRegion: contribution.owner.region,
      source: contribution.owner.source,
      capabilities: contribution.owner.capabilities
    }).map(normalizeQuireLayoutHitTargetLayerFacts)
  ));
  const pages = options.document.pages.map(adaptQuireLayoutPage);
  const layerTargetIndex = createQuireLayoutLayerTargetIndex(
    hitTargets,
    pages,
    options.viewportRect
  );
  const interactionQueryIndex = createQuireLayoutInteractionQueryIndex({
    root,
    pages,
    viewportRect: options.viewportRect
  });

  const snapshot: QuireLayoutSnapshotDraft = {
    state: options.state,
    ...(options.document.paginationTextDiagnostics === undefined ? {} : { paginationTextDiagnostics: options.document.paginationTextDiagnostics }),
    ...(placementSources.size === 0 ? {} : {
      placementAnchors: options.document.anchors.filter(anchor => placementSources.has(anchor.sourceAnchorId))
    }),
    root,
    documentRect: options.document.rect,
    viewportRect: options.viewportRect,
    domOverlays: [
      ...(options.domOverlays ?? []),
      ...persistentLayerContributions.flatMap((contribution) =>
        contribution.domOverlays.map((overlay) => ({
          ...overlay,
          range: overlay.range ?? contribution.range
        }))
      )
    ],
    hitTargets,
    ...(layerContributions.length === 0 ? {} : { layerContributions }),
    ...(layerTargetIndex === undefined ? {} : { layerTargetIndex }),
    ...(interactionQueryIndex === undefined ? {} : { interactionQueryIndex }),
    ...(options.selectionStructureIndex === undefined ? {} : { selectionStructureIndex: options.selectionStructureIndex }),
    ...(options.documentProfile === undefined ? {} : { documentProfile: options.documentProfile }),
    ...(pages.length === 0 ? {} : { pages }),
    ...(regionProducts.selectionPolicies.length === 0
      ? {}
      : { regionSelectionPolicies: regionProducts.selectionPolicies }),
    ...(regionProducts.gaps.length === 0
      ? {}
      : { regionProductGaps: regionProducts.gaps }),
    ...(options.document.anchorPlacementGaps.length === 0
      ? {}
      : { inlinePlacementGaps: options.document.anchorPlacementGaps })
  };

  return attachQuireLayoutSnapshotViewGraph(
    snapshot,
    regionProducts,
    options.viewGraphOptions ?? allocateQuireLayoutSnapshotViewGraphOptions()
  );
}

/**
 * Adapts one engine layout box to the current layout node shape.
 *
 * @param box - Engine layout box to adapt.
 * @param snapshotClipRects - Active snapshot clip rectangles, or undefined.
 * @param interactionRole - Optional inherited interaction and paint role.
 * @param inheritedOwner - Complete owner projected by the containing flow.
 * @param selection - Current editor selection used for nested story activation.
 * @returns Current `QuireLayoutNode` representation.
 */
function adaptLayoutBox(
  box: QuireLayoutBox,
  snapshotClipRects: readonly QuireRect[] | undefined,
  interactionRole?: QuireLayoutNode["interactionRole"],
  inheritedOwner?: QuireLayoutOwnerFacts | undefined,
  selection?: { readonly from: number; readonly to: number } | undefined
): QuireLayoutNode {
  const layoutOwner = box.layoutOwner ?? inheritedOwner;
  const resolvedInteractionRole = resolveQuireLayoutInteractionRole({
    ...(interactionRole === undefined ? {} : { inheritedRole: interactionRole }),
    ...(layoutOwner === undefined ? {} : { owner: layoutOwner }),
    ...(selection === undefined ? {} : { selection })
  });
  const ownsRetainedProducts = resolvedInteractionRole !== "source-geometry";
  snapshotClipRects = resolveLayoutSnapshotClipRects(box, snapshotClipRects);
  const textFragments = clipLayoutTextFragments(box.textFragments, snapshotClipRects);
  // Source geometry is retained only as paint and measurement provenance. The
  // enclosing occurrence owns every query/display product; replaying products
  // from the source box would reintroduce stale pre-pagination identity.
  const subLayoutQueryProducts = ownsRetainedProducts
    ? adaptQuireSubLayoutQueryProductsForSnapshot(box, snapshotClipRects, doesQuireRectIntersectClip)
    : undefined;
  const subLayoutDisplayChunks = ownsRetainedProducts
    ? adaptQuireSubLayoutDisplayChunksForSnapshot(box, snapshotClipRects, doesQuireRectIntersectClip)
    : undefined;
  const regionProducts = ownsRetainedProducts
    ? mergeQuireRetainedRegionProductSets([
        box.regionProducts,
        collectQuireSubLayoutRegionProductsForSnapshot(
          box,
          snapshotClipRects,
          doesQuireRectIntersectClip
        )
      ])
    : undefined;
  const children = adaptLayoutChildren(
    box,
    snapshotClipRects,
    resolvedInteractionRole,
    layoutOwner,
    selection
  );

  return {
    id: box.id,
    kind: "block",
    range: box.range,
    rect: box.rect,
    ...(box.inlineContentWidth === undefined ? {} : { inlineContentWidth: box.inlineContentWidth }),
    ...(box.paintOpacity === undefined ? {} : { paintOpacity: box.paintOpacity }),
    ...(box.paintTransform === undefined
      ? {}
      : { paintTransform: box.paintTransform }),
    ...(box.paintBounds === undefined
      ? {}
      : { paintBounds: box.paintBounds }),
    ...(box.paintClipRect === undefined ? {} : { paintClipRect: box.paintClipRect }),
    ...(box.inlineLayoutRect === undefined
      ? {}
      : { inlineLayoutRect: box.inlineLayoutRect }),
    ...(box.paragraphDecoration === undefined
      ? {}
      : { paragraphDecoration: box.paragraphDecoration }),
    ...(resolvedInteractionRole === undefined
      ? {}
      : { interactionRole: resolvedInteractionRole }),
    ...(textFragments === undefined ? {} : { textFragments }),
    ...(box.textRuns === undefined ? {} : { textRuns: box.textRuns }),
    ...(box.table === undefined ? {} : { table: box.table }),
    ...(box.viewRoot === undefined ? {} : { viewRoot: box.viewRoot }),
    ...(box.viewRegion === undefined ? {} : { viewRegion: box.viewRegion }),
    ...(box.viewCapabilities === undefined
      ? {}
      : { viewCapabilities: box.viewCapabilities }),
    ...(layoutOwner === undefined
      ? {}
      : { layoutOwner }),
    ...(box.exportFallbacks === undefined
      ? {}
      : { exportFallbacks: box.exportFallbacks }),
    ...(regionProducts === undefined
      ? {}
      : { regionProducts }),
    ...(subLayoutQueryProducts === undefined
      ? {}
      : { subLayoutQueryProducts }),
    ...(subLayoutDisplayChunks === undefined
      ? {}
      : { subLayoutDisplayChunks }),
    children
  };
}

/**
 * Attaches a retained view graph built from snapshot annotations.
 *
 * @param snapshot - Adapted layout snapshot with retained annotations.
 * @param regionProducts - Exact products compiled by all retained producers.
 * @param options - Explicit retained graph production options.
 * @returns Snapshot carrying the produced retained view graph.
 */
function attachQuireLayoutSnapshotViewGraph(
  snapshot: QuireLayoutSnapshotDraft,
  regionProducts: QuireRetainedRegionProducts,
  options: QuireLayoutSnapshotViewGraphOptions
): QuireRetainedLayoutSnapshot {
  const result = createQuireLayoutSnapshotViewGraph({
    snapshot,
    regionProducts,
    version: options.version,
    performance: options.performance
  });

  if (result.graph !== null) {
    return {
      ...snapshot,
      viewGraph: result.graph,
      consumerCompilation: result.consumerCompilation
    };
  }

  throw new Error(
    `Cannot attach retained view graph: ${
      result.gaps.map((gap) => `${gap.code} (${gap.message})`).join(", ")
    }`
  );
}

/**
 * Adapts child layout boxes that intersect the active snapshot window.
 *
 * @param box - Parent layout box to inspect.
 * @param snapshotClipRects - Active snapshot clip rectangles, or undefined.
 * @param interactionRole - Optional inherited interaction and paint role.
 * @param layoutOwner - Complete owner projected by the parent flow.
 * @param selection - Current editor selection used for nested story activation.
 * @returns Adapted child layout nodes.
 */
function adaptLayoutChildren(
  box: QuireLayoutBox,
  snapshotClipRects: readonly QuireRect[] | undefined,
  interactionRole?: QuireLayoutNode["interactionRole"],
  layoutOwner?: QuireLayoutOwnerFacts | undefined,
  selection?: { readonly from: number; readonly to: number } | undefined
): QuireLayoutNode[] {
  const directChildren = isQuireLayoutContainer(box) ? box.children : [];
  const subLayoutChildren = readQuireSubLayoutSourceBoxesForSnapshot(
    box,
    snapshotClipRects,
    doesQuireRectIntersectClip
  );

  if (directChildren.length === 0 && subLayoutChildren.length === 0) {
    return [];
  }

  const children: QuireLayoutNode[] = [];
  const childIds = new Set<string>();

  appendAdaptedLayoutChildren(
    children,
    childIds,
    directChildren,
    snapshotClipRects,
    interactionRole,
    layoutOwner,
    selection
  );
  appendAdaptedLayoutChildren(
    children,
    childIds,
    subLayoutChildren,
    snapshotClipRects,
    "source-geometry",
    undefined,
    selection
  );

  return children;
}

/**
 * Appends unique adapted child layout nodes that intersect the active window.
 *
 * @param output - Mutable snapshot child accumulator.
 * @param seenIds - Child ids already appended for this parent.
 * @param boxes - Candidate engine child boxes.
 * @param snapshotClipRects - Active snapshot clip rectangles, or undefined.
 * @param interactionRole - Optional inherited interaction and paint role.
 * @param inheritedOwner - Complete owner projected onto direct children.
 * @param selection - Current editor selection used for nested story activation.
 * @returns Nothing.
 */
function appendAdaptedLayoutChildren(
  output: QuireLayoutNode[],
  seenIds: Set<string>,
  boxes: readonly QuireLayoutBox[],
  snapshotClipRects: readonly QuireRect[] | undefined,
  interactionRole?: QuireLayoutNode["interactionRole"],
  inheritedOwner?: QuireLayoutOwnerFacts | undefined,
  selection?: { readonly from: number; readonly to: number } | undefined
): void {
  for (const child of boxes) {
    if (
      seenIds.has(child.id) ||
      (!doesQuireRectIntersectClip(
        child.paintBounds ?? child.table?.rect ?? child.rect,
        snapshotClipRects
      ) && (child.table !== undefined || !containsQuireFloatingTable(child)))
    ) {
      continue;
    }

    seenIds.add(child.id);
    output.push(adaptLayoutBox(
      child,
      snapshotClipRects,
      interactionRole,
      inheritedOwner,
      selection
    ));
  }
}

/**
 * Reads the current editor selection without requiring synthetic adapter tests
 * to construct a complete editor state.
 *
 * @param state - Snapshot editor state or a deliberately narrow test double.
 * @returns Current document range, or undefined when the state omits PM data.
 */
function readSnapshotSelectionRange(
  state: QuireLayoutSnapshot["state"]
): { readonly from: number; readonly to: number } | undefined {
  const candidate = state as unknown as {
    readonly pm?: {
      readonly selection?: { readonly from: number; readonly to: number };
    };
  };
  const selection = candidate.pm?.selection;
  return selection === undefined
    ? undefined
    : { from: selection.from, to: selection.to };
}
