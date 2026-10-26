import {
  compileQuireViewConsumerDescriptor,
  createQuireViewConsumerOwnerKey
} from "../../../view-graph/consumers";
import type { AppendQuireLayoutViewGraphRegionCandidateOptions } from "../types";
import { createQuireLayoutRegionKey } from "./identity";

/**
 * Appends one unique region and compiles its descriptor in the same phase.
 *
 * @param options - Region plus mutable graph and consumer candidate state.
 * @returns Nothing.
 */
export function appendQuireLayoutRegionCandidate(
  options: AppendQuireLayoutViewGraphRegionCandidateOptions
): void {
  const key = createQuireLayoutRegionKey(options.region);
  options.regionsByKey.set(key, options.region);
  options.regions.push(options.region);

  const compilation = compileQuireViewConsumerDescriptor(
    options.region,
    options.rootsById.get(options.region.ref.rootId.value)
  );
  if (compilation.kind === "unavailable") {
    options.consumerGaps.push(compilation.gap);
    return;
  }

  const ownerKey = createQuireViewConsumerOwnerKey(options.region.ref);
  options.descriptorsByOwner[ownerKey] = compilation.descriptor;
  options.descriptorOwnerKeys.push(ownerKey);
}
