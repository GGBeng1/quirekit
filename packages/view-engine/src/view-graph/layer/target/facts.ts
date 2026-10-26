import type {
  QuireViewInteractionHit,
  QuireViewLayerTargetFacts,
  QuireViewLayerTargetFactsInput,
  QuireViewLayerTargetRoutingInput
} from "../../types";
import { resolveQuireViewLayerPlaneDescriptor } from "../planes";

/**
 * Reports whether a retained target should enter layer-stack routing.
 *
 * @param target - Candidate target and routing facts.
 * @returns Whether this target should be evaluated before geometry fallback.
 */
export function shouldRouteQuireViewLayerTarget(
  target: QuireViewLayerTargetRoutingInput
): boolean {
  return (
    target.hasInteractionHit ||
    target.layer.plane !== "content" ||
    target.pointerPolicy.kind !== "select"
  );
}

/**
 * Resolves canonical layer and pointer-policy facts for a retained target.
 *
 * A retained target may carry facts directly, inherit them from its concrete
 * interaction hit, or rely on the editor layer stack default. This helper keeps
 * that fallback order in the view graph so layout and mounted adapters do not
 * reinterpret layer semantics locally.
 *
 * @param input - Retained target facts to normalize.
 * @returns Canonical layer and pointer policy for the target.
 */
export function resolveQuireViewLayerTargetFacts(
  input: QuireViewLayerTargetFactsInput
): QuireViewLayerTargetFacts {
  const layer = input.layer ??
    input.interactionHit?.layer ??
    { plane: "content" };
  const pointerPolicy = input.pointerPolicy ??
    input.interactionHit?.pointerPolicy ??
    resolveQuireViewLayerPlaneDescriptor(layer.plane).defaultPointerPolicy;

  return {
    layer,
    pointerPolicy
  };
}

/**
 * Reads layer facts that are already present on a retained target.
 *
 * Unlike `resolveQuireViewLayerTargetFacts`, this helper does not materialize
 * default content-layer facts when neither the target nor its interaction hit
 * declared routing state. It is for identity-light query products that should
 * preserve their exposed result shape while still using the canonical fallback
 * when one fact is present and the other must be completed.
 *
 * @param input - Retained target facts to inspect.
 * @returns Existing or completed layer facts, or undefined when no facts exist.
 */
export function readQuireViewLayerTargetFacts(
  input: QuireViewLayerTargetFactsInput
): QuireViewLayerTargetFacts | undefined {
  if (
    input.layer === undefined &&
    input.pointerPolicy === undefined &&
    input.interactionHit?.layer === undefined &&
    input.interactionHit?.pointerPolicy === undefined
  ) {
    return undefined;
  }

  return resolveQuireViewLayerTargetFacts(input);
}

/**
 * Normalizes layer facts copied onto a concrete interaction hit.
 *
 * @param hit - Interaction hit to normalize.
 * @param facts - Canonical layer facts inherited from the owning target.
 * @returns Interaction hit with explicit retained layer and pointer policy.
 */
export function normalizeQuireViewInteractionHitLayerFacts(
  hit: QuireViewInteractionHit,
  facts: QuireViewLayerTargetFacts
): QuireViewInteractionHit {
  return {
    ...hit,
    layer: hit.layer ?? facts.layer,
    pointerPolicy: hit.pointerPolicy ?? facts.pointerPolicy
  };
}
