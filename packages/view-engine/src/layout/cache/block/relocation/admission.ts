import type { QuireBlockLayoutInput } from "../../../engine/block-types";
import type { QuireLayoutBox } from "../../../engine/types";
import { quireLazyShiftedTextFragmentsKey } from "../../../engine/lazy-text-fragments";

const inputFields = new Set<PropertyKey>([
  "id", "range", "minHeight", "spacingBefore", "spacingAfter", "blockStartInset",
  "blockEndInset", "textFragments",
  "textRuns", "sourceAnchors", "layoutSignature", "estimated", "pagination",
  "children", "sourceCapabilities", "flowExclusionGaps", "localFlowExclusions",
  "textFlowReflow", "layoutProvider", "viewRoot", "viewRegion", "viewCapabilities",
  "exportFallbacks", "regionProducts", "paragraphDecoration", "inlineContentWidth"
]);
const boxFields = new Set<PropertyKey>([
  "id", "range", "rect", "inlineLayoutRect", "layoutSignature", "pagination",
  "textFragments", "textRuns", "sourceAnchors", "sourceCapabilities", "textFlowReflow",
  "flowExclusionGaps", "paintTransform", "paintBounds", "paintOpacity", "nodeHandle", "viewRoot",
  "viewRegion", "viewCapabilities", "layoutOwner", "exportFallbacks", "regionProducts",
  "subLayoutFragments", "table", "paragraphDecoration", "inlineContentWidth", quireLazyShiftedTextFragmentsKey
]);

/**
 * Admits only source-local input fields whose position ownership is understood.
 * @param input - Cached input before document-position relocation.
 * @returns Whether ordinary source data can be relocated without provider execution.
 */
export function acceptsQuireInputRelocation(input: QuireBlockLayoutInput): boolean {
  return readQuireInputRelocationFields(input, areQuireInlineCapabilities(input.sourceCapabilities)) !== undefined;
}

/**
 * Checks that sidecars only claim inline extents, which a position shift keeps.
 * @param capabilities - Sidecars carried by an input or a placed box.
 * @returns Whether every sidecar is resolved, inline and without flow exclusion.
 */
export function areQuireInlineCapabilities(capabilities: QuireBlockLayoutInput["sourceCapabilities"]): boolean {
  return (capabilities ?? []).every((capability) => capability.status === "resolved"
    && capability.placement.layoutMode === "inline" && capability.placement.flowExclusion.kind === "none");
}

/**
 * Checks that current sidecars claim the same extents as those a box was placed with.
 * @param placed - Sidecars of the retained box.
 * @param current - Sidecars of the current input.
 * @returns Whether the retained geometry holds for the current sidecars.
 */
export function haveSameQuireCapabilityPlacements(
  placed: QuireBlockLayoutInput["sourceCapabilities"],
  current: QuireBlockLayoutInput["sourceCapabilities"]
): boolean {
  const before = placed ?? [], after = current ?? [];
  return before.length === after.length && before.every((capability, index) => {
    const next = after[index]!;
    return capability.sourceAnchorId === next.sourceAnchorId && capability.status === next.status
      && (capability.status !== "resolved" || next.status !== "resolved" || capability.placement === next.placement
        || JSON.stringify(capability.placement) === JSON.stringify(next.placement));
  });
}

/**
 * Returns the complete admitted field set for one ordinary source relocation.
 * @param input - Immutable cached input whose keys must all be understood.
 * @param replacesCapabilities - Whether the caller substitutes freshly resolved sidecars.
 * @returns Own keys for selective copying, or undefined for independent authority.
 */
export function readQuireInputRelocationFields(
  input: QuireBlockLayoutInput,
  replacesCapabilities = false
): readonly PropertyKey[] | undefined {
  const fields = readKnownFields(input, inputFields);
  return fields !== undefined
    && input.children === undefined && input.layoutProvider === undefined
    && input.viewRoot === undefined && input.viewRegion === undefined
    && input.viewCapabilities === undefined && input.exportFallbacks === undefined
    && input.regionProducts === undefined
    && (replacesCapabilities || (input.sourceCapabilities?.length ?? 0) === 0) ? fields : undefined;
}

/**
 * Rejects independent owner/query products before retained-record projection.
 * @param box - Previously placed leaf result.
 * @returns Whether all retained fields are ordinary geometry or source-local data.
 */
export function acceptsQuireBoxRelocation(box: QuireLayoutBox): boolean {
  return readKnownFields(box, boxFields) !== undefined
    && box.nodeHandle === undefined && box.viewRoot === undefined
    && box.viewRegion === undefined && box.viewCapabilities === undefined
    && box.layoutOwner === undefined && box.exportFallbacks === undefined
    && box.regionProducts === undefined && box.subLayoutFragments === undefined
    && box.table === undefined && areQuireInlineCapabilities(box.sourceCapabilities);
}

/**
 * Checks descriptors without evaluating text or signature getters.
 * @param source - Immutable ordinary source product.
 * @param fields - Exact field set understood at this boundary.
 * @returns Complete own keys, or undefined for unknown own or prototype state.
 */
function readKnownFields(
  source: object,
  fields: ReadonlySet<PropertyKey>
): readonly PropertyKey[] | undefined {
  const prototype = Object.getPrototypeOf(source);
  if (prototype !== Object.prototype && prototype !== null) return undefined;
  const keys = Reflect.ownKeys(source);
  return keys.every((key) => fields.has(key)) ? keys : undefined;
}
