import type { QuireRect } from "@quirekit/renderer";
import type { QuireRetainedRegionProductGap } from "../declaration/types";
import {
  deferQuireLayerContributionBody,
  readQuireLayerContributionBody,
  recordQuireLayerContributionRealizationGaps
} from "./deferred";
import type {
  QuireRetainedLayerContribution,
  QuireRetainedLayerContributionDeclaration,
  QuireRetainedLayerContributionHeader
} from "./types";
import {
  cloneQuireLayerContributionValidationState,
  validateQuireRetainedLayerContributionBody,
  validateQuireRetainedLayerContributionHeader,
  type QuireLayerContributionValidationState
} from "./validation";
import type { QuireLayerContributionValidationContext } from "./validation/gap";

/**
 * Compiles a deferred declaration: its header is validated now, its artifacts on first read.
 *
 * The artifacts are checked against the producer's ids as they stood after eager compilation.
 * A failed check records its gaps and realizes an empty body, so the producer's other
 * contributions stay intact.
 *
 * @param header - Compiled header with the exact retained owner.
 * @param declaration - Deferred declaration supplying the artifacts.
 * @param producerState - Producer-scoped indexes, copied when the body is realized.
 * @param ownerRect - Exact owner region rectangle, when available.
 * @param context - Producer facts attached to gaps.
 * @param gaps - Mutable canonical gap sink for header gaps.
 * @returns Compiled contribution with a deferred, validated body, or undefined for an invalid header.
 */
export function compileQuireDeferredLayerContribution(
  header: QuireRetainedLayerContributionHeader,
  declaration: QuireRetainedLayerContributionDeclaration,
  producerState: QuireLayerContributionValidationState,
  ownerRect: QuireRect | undefined,
  context: QuireLayerContributionValidationContext,
  gaps: QuireRetainedRegionProductGap[]
): QuireRetainedLayerContribution | undefined {
  const candidate = header as QuireRetainedLayerContribution;
  if (!validateQuireRetainedLayerContributionHeader(candidate, producerState, ownerRect, context, gaps)) {
    return undefined;
  }
  const contribution: QuireRetainedLayerContribution = deferQuireLayerContributionBody(header, () => {
    const body = readQuireLayerContributionBody(declaration);
    const realizationGaps: QuireRetainedRegionProductGap[] = [];
    if (validateQuireRetainedLayerContributionBody(
      { ...header, ...body },
      cloneQuireLayerContributionValidationState(producerState),
      context,
      realizationGaps
    )) {
      return body;
    }
    recordQuireLayerContributionRealizationGaps(contribution, realizationGaps);
    return { commands: [], domOverlays: [], targets: [] };
  });
  return contribution;
}
