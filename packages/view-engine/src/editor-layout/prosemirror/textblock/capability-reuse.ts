import type { QuireBlockLayoutInput } from "../../../layout/engine/block-types";
import type {
  QuireInlineSourceCapabilityRegistry,
  QuireInlineSourceCapabilityResolverResult,
  QuireInlineSourceCapabilitySidecar
} from "../../../layout/engine/inline/source-capability";
import type {
  QuireTextblockCapabilityRecord,
  QuireTextblockCapabilityResolution,
  QuireTextblockCapabilityRevalidator
} from "../../../layout/cache/block/types";
import { createTextblockLayoutSignature } from "../block-layout-signature";
import { createInlineSourceSidecar } from "../inline/source";
import type { QuireProseMirrorBlockInputOptions } from "../types";

/**
 * Routes one textblock's capability resolutions through a recorder.
 *
 * @param options - Collector options of the textblock.
 * @param resolutions - Sink receiving every resolution in collection order.
 * @returns Options whose registry records into `resolutions`.
 */
export function recordTextblockCapabilities(
  options: QuireProseMirrorBlockInputOptions,
  resolutions: QuireTextblockCapabilityResolution[]
): QuireProseMirrorBlockInputOptions {
  const registry = options.sourceCapabilityRegistry;
  return registry === undefined ? options : { ...options, sourceCapabilityRegistry: {
    /** @param input - Resolver input. @returns The wrapped registry's result. */
    resolve(input) {
      const result = registry.resolve(input);
      resolutions.push({ input, result });
      return result;
    }
  } };
}

/**
 * Admits a collected capability-bearing input for revalidated reuse.
 *
 * Collection consumes only the placement of a sidecar. Inline placements
 * without flow exclusion leave no other trace in the input, so equal
 * placements reproduce the same shaped input.
 *
 * @param resolutions - Resolutions recorded while the input was collected.
 * @param input - Collected input.
 * @returns Cache record, or undefined when the input must keep missing.
 */
export function createTextblockCapabilityRecord(
  resolutions: readonly QuireTextblockCapabilityResolution[],
  input: QuireBlockLayoutInput
): QuireTextblockCapabilityRecord | undefined {
  if ((input.sourceCapabilities?.length ?? 0) === 0 || input.localFlowExclusions !== undefined
    || input.flowExclusionGaps !== undefined
    || resolutions.some(({ input: request, result }) => result !== undefined && (request.sourceAnchorId === undefined || result.status !== "resolved"
      || result.placement.layoutMode !== "inline" || result.placement.flowExclusion.kind !== "none"))) return undefined;
  return { resolutions: [...resolutions], placementKey: readPlacementKey(resolutions.map(({ result }) => result)) };
}

/**
 * Creates the revalidation used when a cached capability-bearing input is read.
 *
 * Every recorded resolution is repeated through the current registry at the
 * moved position, so candidate text and document state are current. The input
 * is reused only when all placements are unchanged; the fresh sidecars carry
 * the current presentation.
 *
 * @param registry - Current pass's capability registry.
 * @param contentStart - Current absolute content start of the textblock.
 * @returns Revalidation for the shape cache, absent without a registry.
 */
export function createTextblockCapabilityRevalidator(
  registry: QuireInlineSourceCapabilityRegistry | undefined,
  contentStart: number
): QuireTextblockCapabilityRevalidator | undefined {
  return registry === undefined ? undefined : (record, delta) => {
    const results = record.resolutions.map(({ input }) => registry.resolve(
      delta === 0 || input.position === undefined ? input : { ...input, position: input.position + delta }));
    if (readPlacementKey(results) !== record.placementKey) return undefined;
    const sourceCapabilities: QuireInlineSourceCapabilitySidecar[] = [];
    record.resolutions.forEach(({ input }, index) => {
      const result = results[index];
      if (result !== undefined) sourceCapabilities.push(createInlineSourceSidecar(input.sourceAnchorId!, input.nodeType, result));
    });
    return { sourceCapabilities, layoutSignature: (moved) =>
      createTextblockLayoutSignature(moved.textFragments ?? [], moved.sourceAnchors ?? [], sourceCapabilities, contentStart) };
  };
}

/**
 * @param results - Resolver results in collection order.
 * @returns Identity of their claims and placements.
 */
function readPlacementKey(results: readonly (QuireInlineSourceCapabilityResolverResult | undefined)[]): string {
  return results.map((result) => result === undefined ? "-" : result.status === "resolved" ? JSON.stringify(result.placement) : "gap").join("\u0001");
}
