import type {
  QuireHitTestSelectionTargetOptions,
  QuireInteractionSelectionTarget
} from "./types";
import {
  resolveQuireInteractionHitSelectionDomain,
  resolveQuireSelectionPolicyDomain
} from "./domain";
import { resolveQuireExplicitInteractionOwnerFacts } from "./owner-facts";

/**
 * Resolves selection and command target facts from a retained hit-test result.
 *
 * @param options - Hit-test result with optional retained interaction facts.
 * @returns Selection target facts, or null for a miss or incomplete owner.
 */
export function resolveQuireHitTestSelectionTarget(
  options: QuireHitTestSelectionTargetOptions
): QuireInteractionSelectionTarget | null {
  const { hitTestResult } = options;

  if (hitTestResult.kind === "miss") {
    return null;
  }

  const interactionHit = hitTestResult.interactionHit;
  const owner = resolveQuireExplicitInteractionOwnerFacts({
    region:
      hitTestResult.queryOwner?.region
      ?? interactionHit?.region
      ?? hitTestResult.viewRegion,
    source: interactionHit?.source ?? hitTestResult.ownerSource,
    capabilities:
      interactionHit?.capabilities ?? hitTestResult.ownerCapabilities
  });

  if (owner.kind === "gap") {
    return null;
  }

  const fallback = interactionHit === undefined
    ? { domain: "text" as const, commandTarget: "editable-text" as const }
    : resolveQuireInteractionHitSelectionDomain(interactionHit.kind);
  const route = resolveQuireSelectionPolicyDomain(
    hitTestResult.selectionPolicy,
    fallback
  );

  return {
    ...route,
    hitKind: interactionHit?.kind ?? "position",
    ...(hitTestResult.selectionPolicy === undefined
      ? {}
      : { selectionPolicy: hitTestResult.selectionPolicy }),
    region: owner.region,
    source: owner.source,
    capabilities: owner.capabilities,
    ...(hitTestResult.queryOwner === undefined
      ? {}
      : { queryOwner: hitTestResult.queryOwner }),
    ...(hitTestResult.interactionScope === undefined
      ? {}
      : { interactionScope: hitTestResult.interactionScope }),
    referenceRect: hitTestResult.rect,
    ...((hitTestResult.layer ?? interactionHit?.layer) === undefined
      ? {}
      : { layer: hitTestResult.layer ?? interactionHit?.layer }),
    ...((hitTestResult.pointerPolicy ?? interactionHit?.pointerPolicy) === undefined
      ? {}
      : {
          pointerPolicy:
            hitTestResult.pointerPolicy ?? interactionHit?.pointerPolicy
        }),
    ...(interactionHit === undefined ? {} : { interactionHit }),
    ...(hitTestResult.tableCell === undefined
      ? {}
      : { tableCell: hitTestResult.tableCell })
  };
}
