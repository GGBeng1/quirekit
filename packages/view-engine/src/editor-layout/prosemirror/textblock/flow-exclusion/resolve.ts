import {
  type QuireInlineExclusionGeometry,
  type QuireInlineSourceAnchor,
  type QuireInlineSourceFlowExclusionIntent
} from "@quirekit/layout/inline";
import { compileQuireInlineVisualPlacement } from "../../../../layout/engine/inline/placement-reference";
import type { QuireInlineSourceCapabilitySidecar } from "../../../../layout/engine/inline/source-capability";
import { createQuireLocalPlacementReferences } from "./references";
import {
  expandQuireTextblockExclusionRect,
  resolveQuireTextblockRowSlots
} from "./slots";
import type {
  QuireLocalTextblockFlowExclusion,
  QuireTextblockFlowSlots,
  ResolveQuireTextblockFlowSlotsOptions
} from "./types";

/**
 * Resolves the first bounded square-wrap slice from a baseline paragraph shape.
 *
 * Only column-relative inline placement plus paragraph-offset block placement
 * is accepted in this pre-pagination phase. Other references remain owned by
 * later page placement and deliberately do not receive guessed geometry.
 *
 * @param options - Baseline fragments, logical sources, and paragraph metrics.
 * @returns Stable row slots, or undefined when no locally provable exclusion exists.
 */
export function resolveQuireTextblockFlowSlots(
  options: ResolveQuireTextblockFlowSlotsOptions
): QuireTextblockFlowSlots | undefined {
  const exclusions = resolveQuireTextblockFlowExclusions(options);
  if (exclusions.length === 0) {
    return undefined;
  }

  // Materialize only the rows reached by current exclusions. The text layout
  // primitive resumes its full-width fallback after the declared slot rows.
  const lastRow = Math.max(
    0,
    ...exclusions.map((exclusion) =>
      Math.ceil((exclusion.rect.y + exclusion.rect.height) / options.lineHeight) - 1
    )
  );
  const lineSlots = Array.from({ length: lastRow + 1 }, (_, rowIndex) =>
    resolveQuireTextblockRowSlots(
      options.width,
      options.lineHeight,
      rowIndex,
      exclusions
    )
  );

  return {
    lineSlots,
    signature: lineSlots.map((slots) => slots
      .map((slot) => `${slot.x}:${slot.width}`)
      .join(","))
      .join(";"),
    participants: exclusions.map((exclusion) => exclusion.participant)
  };
}

/**
 * Resolves accepted local exclusions from one baseline textblock shape.
 *
 * The returned geometry remains textblock-local so the container flow pass can
 * translate it into one concrete sibling-flow occurrence without reconstructing
 * placement intent from retained display products.
 *
 * @param options - Baseline fragments, logical sources, and paragraph metrics.
 * @returns Accepted local exclusions in stable source-capability order.
 */
export function resolveQuireTextblockFlowExclusions(
  options: ResolveQuireTextblockFlowSlotsOptions
): readonly QuireLocalTextblockFlowExclusion[] {
  const anchorsById = new Map(
    options.sourceAnchors.map((anchor) => [anchor.id, anchor])
  );
  const exclusions: QuireLocalTextblockFlowExclusion[] = [];

  for (const capability of options.sourceCapabilities) {
    const anchor = anchorsById.get(capability.sourceAnchorId);
    const exclusion = anchor === undefined
      ? undefined
      : resolveLocalFlowExclusion(options, anchor, capability);
    if (exclusion !== undefined) {
      exclusions.push(exclusion);
    }
  }

  return exclusions;
}

/**
 * Reports whether a paragraph owns an anchored exclusion that requires a
 * geometry-aware shaping path.
 *
 * @param capabilities - Source capabilities collected from the paragraph.
 * @returns True when at least one resolved anchored source removes flow space.
 */
export function hasQuireTextblockFlowExclusion(
  capabilities: readonly QuireInlineSourceCapabilitySidecar[]
): boolean {
  return capabilities.some((capability) =>
    capability.status === "resolved"
    && capability.placement.layoutMode === "anchored"
    && capability.placement.flowExclusion.kind !== "none"
  );
}

/**
 * Resolves one capability into a clearance-expanded local exclusion.
 *
 * @param options - Baseline paragraph inputs.
 * @param anchor - Exact logical source anchor.
 * @param capability - Capability claimed for the anchor.
 * @returns Local exclusion, or undefined when this phase lacks authority.
 */
function resolveLocalFlowExclusion(
  options: ResolveQuireTextblockFlowSlotsOptions,
  anchor: QuireInlineSourceAnchor,
  capability: QuireInlineSourceCapabilitySidecar
): QuireLocalTextblockFlowExclusion | undefined {
  if (capability.status !== "resolved") {
    return undefined;
  }
  const placement = capability.placement;
  const intent = placement.flowExclusion;
  if (
    placement.layoutMode !== "anchored"
    || intent.kind === "none"
    || placement.constrainToRegion
    || placement.inlinePlacement.reference !== "column"
    || placement.blockPlacement.kind !== "offset"
    || placement.blockPlacement.reference !== "paragraph"
  ) {
    return undefined;
  }

  const references = createQuireLocalPlacementReferences(options, anchor);
  if (references === undefined) {
    return undefined;
  }
  const result = compileQuireInlineVisualPlacement({
    sourceAnchorId: anchor.id,
    occurrence: { kind: "single" },
    placementReferences: references
  }, placement);
  if (result.status !== "resolved") {
    return undefined;
  }

  const rect = result.placement.rect;

  return {
    participant: {
      sourceAnchorId: anchor.id,
      objectId: placement.objectId
    },
    rect: expandQuireTextblockExclusionRect({
      rect,
      clearance: intent.clearance
    }),
    geometry: resolveLocalExclusionGeometry(rect, intent)
  };
}

/**
 * Materializes source-relative wrap intent into paragraph-local geometry.
 *
 * @param rect - Resolved unexpanded object bounds.
 * @param intent - Non-empty canonical exclusion intent.
 * @returns Generic row-band exclusion geometry.
 */
function resolveLocalExclusionGeometry(
  rect: Readonly<{ x: number; y: number; width: number; height: number }>,
  intent: Exclude<
    QuireInlineSourceFlowExclusionIntent,
    { readonly kind: "none" }
  >
): QuireInlineExclusionGeometry {
  if (intent.kind === "rectangle") {
    return {
      kind: "rectangle",
      bounds: rect,
      clearance: intent.clearance,
      side: intent.side
    };
  }
  if (intent.kind === "block-band") {
    return { kind: "block-band", bounds: rect, clearance: intent.clearance };
  }
  return {
    kind: intent.kind,
    bounds: rect,
    clearance: intent.clearance,
    side: intent.side,
    paths: intent.paths.map((path) => ({
      points: path.points.map((point) => ({
        x: rect.x + point.x * rect.width,
        y: rect.y + point.y * rect.height
      }))
    }))
  };
}
