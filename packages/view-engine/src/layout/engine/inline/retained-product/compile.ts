import type {
  QuireLayoutCapabilitySet
} from "@quirekit/layout/identity";
import type { QuireRect } from "@quirekit/renderer";
import type {
  QuireViewLayerRef
} from "../../../../view-graph";
import {
  compileQuireRetainedLayerContributionView,
  compileQuireRetainedRegionProductSet,
  type QuireRetainedRegionProductDeclaration
} from "../../../region-products";
import type { QuireLayoutAnchor } from "../../types";
import { compileQuireInlineVisualPlacement } from "../placement-reference";
import type { QuireInlinePlacementGap } from "../placement-reference";
import type {
  QuireInlineSourceCapabilitySidecar,
  QuireResolvedInlineSourceCapabilitySidecar
} from "../source-capability";
import { clipQuireInlineRetainedContributionToPage } from "./page-clip";
import {
  resolveQuireInlineInteractionTargetGeometry,
  transformQuireInlineSelectedContribution
} from "./interaction-transform";
import type { QuireInlineRetainedProductCompilation } from "./types";

const anchoredObjectCapabilities = {
  editable: false,
  selectable: true,
  focusable: true,
  copyable: true,
  commandable: true,
  accessible: true
} as const satisfies QuireLayoutCapabilitySet;

/**
 * Compiles inline visual occurrences into complete retained owner products.
 *
 * Placement resolves before product declaration so no root, region, target, or
 * selection policy can observe partial geometry. Presentation facts remain
 * source-owned while occurrence identity remains pagination-owned.
 *
 * @param anchors - Exact visual occurrences produced by source flow or pagination.
 * @param sourceCapabilities - Claimed View products keyed by source anchor id.
 * @returns Canonical retained products plus placement gaps.
 */
export function compileQuireInlineRetainedProducts(
  anchors: readonly QuireLayoutAnchor[],
  sourceCapabilities: readonly QuireInlineSourceCapabilitySidecar[]
): QuireInlineRetainedProductCompilation {
  const declarations: QuireRetainedRegionProductDeclaration[] = [];
  const placementGaps: QuireInlinePlacementGap[] = [];
  const capabilityByAnchorId = indexSourceCapabilities(
    anchors,
    sourceCapabilities
  );

  for (const anchor of anchors) {
    const capability = capabilityByAnchorId.get(anchor.sourceAnchorId);
    if (capability?.status !== "resolved") {
      continue;
    }
    if (capability.nodeType !== anchor.nodeType) {
      throw new RangeError(
        `Source anchor "${anchor.sourceAnchorId}" and its View capability sidecar disagree on node type.`
      );
    }
    const placement = compileQuireInlineVisualPlacement({
      sourceAnchorId: anchor.sourceAnchorId,
      occurrence: anchor.occurrence,
      placementReferences: anchor.placementReferences,
      ownerRegionKind: anchor.owner.region.kind
    }, capability.placement);
    if (placement.status === "gap") {
      placementGaps.push(...placement.gaps);
      continue;
    }

    declarations.push(createAnchoredObjectDeclaration(
      anchor,
      capability,
      placement.placement.rect
    ));
  }

  return {
    products: compileQuireRetainedRegionProductSet(declarations),
    placementGaps
  };
}

/**
 * Indexes exact View sidecars after validating their source ownership.
 *
 * A sidecar may feed multiple page occurrences of the same logical source, but
 * it may not exist without that source or compete with another sidecar. These
 * checks keep migration gaps explicit instead of silently selecting one value.
 *
 * @param anchors - Active visual occurrences that retain logical source ids.
 * @param sourceCapabilities - View sidecars supplied for this compilation.
 * @returns Unique sidecars keyed by logical source anchor id.
 */
function indexSourceCapabilities(
  anchors: readonly QuireLayoutAnchor[],
  sourceCapabilities: readonly QuireInlineSourceCapabilitySidecar[]
): ReadonlyMap<string, QuireInlineSourceCapabilitySidecar> {
  const activeSourceAnchorIds = new Set(
    anchors.map((anchor) => anchor.sourceAnchorId)
  );
  const capabilityByAnchorId = new Map<
    string,
    QuireInlineSourceCapabilitySidecar
  >();

  for (const capability of sourceCapabilities) {
    if (!activeSourceAnchorIds.has(capability.sourceAnchorId)) {
      throw new RangeError(
        `View capability sidecar "${capability.sourceAnchorId}" has no active source anchor.`
      );
    }
    if (capabilityByAnchorId.has(capability.sourceAnchorId)) {
      throw new RangeError(
        `Source anchor "${capability.sourceAnchorId}" has multiple View capability sidecars.`
      );
    }
    capabilityByAnchorId.set(capability.sourceAnchorId, capability);
  }

  return capabilityByAnchorId;
}

/**
 * Creates one exact retained declaration from a resolved visual occurrence.
 *
 * @param anchor - Occurrence carrying source and presentation authority.
 * @param capability - Resolved View capability sidecar for the logical source.
 * @param rect - Resolved document-space placement rectangle.
 * @returns Complete retained-region declaration for the occurrence.
 */
function createAnchoredObjectDeclaration(
  anchor: QuireLayoutAnchor,
  capability: QuireResolvedInlineSourceCapabilitySidecar,
  rect: QuireLayoutAnchor["rect"]
): QuireRetainedRegionProductDeclaration {
  const interactionScope = anchor.interactionScope ?? anchor.owner;
  const source = { sourceId: anchor.sourceAnchorId, range: anchor.range };
  const rootId = `root:anchored-object:${capability.placement.objectId}`;
  const regionId = `region:anchored-object:${capability.placement.objectId}`;
  const visualInstanceId = anchor.occurrence.kind === "page"
    ? anchor.occurrence.visualInstanceId
    : undefined;
  const layer = resolveAnchoredObjectLayer(
    capability.placement.paintOrder,
    capability.placement.stackingOrder
  );
  const region = {
    rootId: { value: rootId },
    regionId: { value: regionId },
    kind: "floating-object" as const,
    ...(visualInstanceId === undefined ? {} : { visualInstanceId })
  };
  const semantics = {
    role: capability.presentation.semanticRole,
    search: capability.presentation.search
  };
  const compiledLayerContribution = compileQuireRetainedLayerContributionView({
    contributionId: `visual:${anchor.id}`,
    rootId,
    regionId,
    ...(visualInstanceId === undefined ? {} : { visualInstanceId }),
    interactionScope,
    range: anchor.range,
    rect,
    ...(capability.presentation.viewVisualOverflow === undefined
      ? {}
      : {
          visualBounds: expandQuireInlineViewBounds(
            rect,
            capability.presentation.viewVisualOverflow
          )
        }),
    layer,
    paintSurface: "content",
    node: capability.presentation.view
  });
  const compiledSelectedLayerContribution = capability.presentation.selectedView === undefined
    ? undefined
    : transformQuireInlineSelectedContribution(
        compileQuireRetainedLayerContributionView({
          contributionId: `selection:${anchor.id}`,
          rootId,
          regionId,
          ...(visualInstanceId === undefined ? {} : { visualInstanceId }),
          interactionScope,
          range: anchor.range,
          rect,
          ...(capability.presentation.selectedViewVisualOverflow === undefined
            ? {}
            : {
                visualBounds: expandQuireInlineViewBounds(
                  rect,
                  capability.presentation.selectedViewVisualOverflow
                )
              }),
          layer: { plane: "controls", zIndex: capability.placement.stackingOrder },
          paintSurface: "overlay",
          activation: capability.presentation.selectedViewActivation
            ?? { kind: "selected-owner" },
          node: capability.presentation.selectedView
        }),
        rect,
        capability.presentation.interactionTransform?.rotation
      );
  const pageRect = anchor.occurrence.kind === "page"
    ? anchor.placementReferences.page
    : undefined;
  const clippedLayerContribution = pageRect === undefined
    ? { contribution: compiledLayerContribution, targetRect: rect }
    : clipQuireInlineRetainedContributionToPage(
        compiledLayerContribution,
        pageRect
      );
  const selectedLayerContribution = compiledSelectedLayerContribution === undefined
    ? undefined
    : pageRect === undefined
      ? compiledSelectedLayerContribution
      : clipQuireInlineRetainedContributionToPage(
          compiledSelectedLayerContribution,
          pageRect
        ).contribution;
  const interactionTargets = (capability.presentation.interactionHitAreas ?? [undefined]).map(area =>
    resolveQuireInlineInteractionTargetGeometry(rect, capability.presentation.interactionTransform?.rotation, pageRect, area));

  return {
    producerId: `anchored-object:${anchor.id}`,
    sourceKind: anchor.nodeType,
    source,
    productKinds: [
      "view-root",
      "view-region",
      "layer-contribution",
      "layer-target",
      "selection-policy",
      "export-fallback"
    ],
    root: {
      rootId,
      kind: capability.presentation.rootKind,
      source,
      capabilities: anchoredObjectCapabilities,
      semantics,
      exportFallbacks: capability.presentation.exportFallbacks
    },
    regions: [{
      regionId,
      kind: "floating-object",
      source,
      rect,
      coordinateSpace: "document",
      visualInstance: visualInstanceId === undefined
        ? { kind: "single" }
        : { kind: "repeated", visualInstanceId },
      capabilities: anchoredObjectCapabilities,
      semantics,
      exportFallbacks: capability.presentation.exportFallbacks
    }],
    layerContributions: [
      clippedLayerContribution.contribution,
      ...(selectedLayerContribution === undefined ? [] : [selectedLayerContribution])
    ],
    layerTargets: interactionTargets.flatMap((interactionTarget, index) => interactionTarget.rect === null
      ? []
      : [{
          targetId: `object:${anchor.id}${index === 0 ? "" : `:part:${index}`}`,
          regionId,
          interactionScope,
          range: anchor.range,
          rect: interactionTarget.rect,
          ...(interactionTarget.hitArea === undefined
            ? {}
            : { hitArea: interactionTarget.hitArea }),
          layer,
          interactionHit: {
            kind: "object",
            objectId: capability.placement.objectId,
            region,
            layer,
            source,
            capabilities: anchoredObjectCapabilities
          }
        }]),
    selectionPolicies: [{
      policyId: `object-selection:${anchor.id}`,
      regionId,
      kind: "object-selection"
    }]
  };
}

/**
 * Expands accepted placement to contain declared physical visual overflow.
 *
 * @param rect - Exact accepted object rectangle.
 * @param overflow - Source-declared physical controls overflow.
 * @returns Document-space bounds containing the contribution artifacts.
 */
function expandQuireInlineViewBounds(
  rect: QuireRect,
  overflow: NonNullable<
    QuireResolvedInlineSourceCapabilitySidecar["presentation"]["selectedViewVisualOverflow"]
  >
): QuireRect {
  return {
    x: rect.x - overflow.left,
    y: rect.y - overflow.top,
    width: rect.width + overflow.left + overflow.right,
    height: rect.height + overflow.top + overflow.bottom
  };
}

/**
 * Resolves source paint intent into the canonical editor layer stack.
 *
 * @param paintOrder - Relationship to normal document content.
 * @param stackingOrder - Relative object order inside the selected plane.
 * @returns Exact editor layer reference shared by paint and interaction.
 */
function resolveAnchoredObjectLayer(
  paintOrder: "behind-content" | "above-content",
  stackingOrder: number
): QuireViewLayerRef {
  return {
    plane: paintOrder === "behind-content"
      ? "drawing-behind-content"
      : "drawing",
    zIndex: stackingOrder
  };
}
