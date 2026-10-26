import { createQuireViewConsumerOwnerKey } from "./key";
import type {
  QuireViewConsumerCompilation,
  QuireViewConsumerOwnerAddress,
  QuireViewConsumerOwnerQueryResult
} from "./types";

/**
 * Queries one descriptor by exact root, region, and visual-instance identity.
 *
 * @param compilation - Required retained consumer compilation.
 * @param owner - Exact command or interaction owner to resolve.
 * @returns Exact descriptor or explicit unavailability gaps.
 */
export function queryQuireViewConsumerDescriptorByOwner(
  compilation: QuireViewConsumerCompilation,
  owner: QuireViewConsumerOwnerAddress
): QuireViewConsumerOwnerQueryResult {
  if (compilation.kind === "unavailable") {
    return compilation;
  }

  const key = createQuireViewConsumerOwnerKey(owner);
  const descriptor = compilation.descriptorsByOwner[key];

  if (descriptor === undefined || !compilation.indexedOwnerKeys.includes(key)) {
    return {
      kind: "unavailable",
      gaps: [{
        code: "missing-consumer-query-index",
        message: `Exact consumer owner "${key}" is not reachable through the retained query index.`
      }]
    };
  }

  return { kind: "ready", descriptor };
}
