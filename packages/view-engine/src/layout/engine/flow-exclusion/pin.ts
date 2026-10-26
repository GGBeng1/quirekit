import type { QuireBlockLayoutInput } from "../block-types";
import { translateQuireInlineExclusionGeometry } from "@quirekit/layout/inline";
import type {
  QuireInlineSourceCapabilitySidecar
} from "../inline/source-capability";
import type { QuireActiveBlockFlowExclusion } from "./reflow";

/**
 * Stabilizes owned object placements against the unwrapped baseline geometry.
 *
 * Floating objects establish their physical position from the ordinary block
 * baseline before exclusions reshape surrounding text. The resulting wrap must
 * not feed the paragraph displacement back into the same object's position, or
 * a negative paragraph offset can oscillate between two rows and leave ghost
 * slots behind. Both movement policies share this within-pass invariant. Their
 * difference applies when a later document baseline moves the anchor.
 *
 * @param input - Reflowed textblock input that may own rectangle exclusions.
 * @param blockY - Final textblock origin in the current sibling flow.
 * @param baselineExclusions - Baseline-pinned exclusions for the current scope.
 * @returns Original input or a clone aligned with baseline object geometry.
 */
export function stabilizeOwnedBlockFlowPlacements(
  input: QuireBlockLayoutInput,
  blockY: number,
  baselineExclusions: readonly QuireActiveBlockFlowExclusion[]
): QuireBlockLayoutInput {
  const exclusions = input.localFlowExclusions;
  if (exclusions === undefined || exclusions.length === 0) {
    return input;
  }

  const baselineByAnchor = new Map(
    baselineExclusions.map((exclusion) => [exclusion.sourceAnchorId, exclusion])
  );
  const deltas = new Map<string, number>();
  for (const exclusion of exclusions) {
    const baseline = baselineByAnchor.get(exclusion.sourceAnchorId);
    if (baseline === undefined) continue;

    const delta = baseline.rect.y - (blockY + exclusion.rect.y);
    if (delta !== 0) {
      deltas.set(exclusion.sourceAnchorId, delta);
    }
  }
  if (deltas.size === 0) {
    return input;
  }

  return {
    ...input,
    localFlowExclusions: exclusions.map((exclusion) =>
      deltas.has(exclusion.sourceAnchorId)
        ? {
            ...exclusion,
            rect: {
              ...exclusion.rect,
              y: exclusion.rect.y + (deltas.get(exclusion.sourceAnchorId) ?? 0)
            },
            geometry: translateQuireInlineExclusionGeometry(
              exclusion.geometry,
              0,
              deltas.get(exclusion.sourceAnchorId) ?? 0
            )
          }
        : exclusion
    ),
    ...(input.sourceCapabilities === undefined
      ? {}
      : {
          sourceCapabilities: input.sourceCapabilities.map((capability) =>
            rebaseOwnedCapability(capability, deltas)
          )
        }),
    layoutSignature: `${input.layoutSignature ?? input.id}\u0000flow-stable:${[
      ...deltas
    ].sort(([left], [right]) => left.localeCompare(right)).map(
      ([sourceAnchorId, delta]) => `${sourceAnchorId}:${delta}`
    ).join(";")}`
  };
}

/**
 * Rebases one supported paragraph-offset placement to its baseline geometry.
 *
 * @param capability - Source capability attached to the owning textblock.
 * @param deltas - Required local placement delta by source-anchor id.
 * @returns Original capability or a layout-only rebased clone.
 */
function rebaseOwnedCapability(
  capability: QuireInlineSourceCapabilitySidecar,
  deltas: ReadonlyMap<string, number>
): QuireInlineSourceCapabilitySidecar {
  const delta = deltas.get(capability.sourceAnchorId);
  if (
    delta === undefined
    || capability.status !== "resolved"
    || capability.placement.layoutMode !== "anchored"
    || capability.placement.flowExclusion.kind === "none"
    || capability.placement.blockPlacement.kind !== "offset"
    || capability.placement.blockPlacement.reference !== "paragraph"
  ) {
    return capability;
  }

  return {
    ...capability,
    placement: {
      ...capability.placement,
      blockPlacement: {
        ...capability.placement.blockPlacement,
        offset: capability.placement.blockPlacement.offset + delta
      }
    }
  };
}
