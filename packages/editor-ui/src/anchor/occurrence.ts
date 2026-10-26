import type {
  QuireHitTarget,
  QuireLayoutSnapshot,
  QuireSelectionGeometryContext
} from "@quirekit/view-engine";
import { resolveRetainedTargets } from "./targets";
import type { EditorUIAnchorOccurrence } from "./types";

/** Exact retained occurrence context or explicit absence. */
export type EditorUIOccurrenceContextResolution =
  | {
      readonly status: "matched";
      readonly context: QuireSelectionGeometryContext | undefined;
      readonly sourceTargetIds: readonly string[];
    }
  | { readonly status: "unavailable" };

/**
 * Resolves a caller-owned occurrence into canonical retained query context.
 *
 * @param snapshot - Retained interaction snapshot that owns hit targets.
 * @param occurrence - Exact target or visual-instance identity.
 * @returns Retained geometry context or explicit absence.
 */
export function resolveEditorUIOccurrenceContext(
  snapshot: QuireLayoutSnapshot,
  occurrence: EditorUIAnchorOccurrence | undefined
): EditorUIOccurrenceContextResolution {
  if (occurrence === undefined) {
    return { status: "matched", context: undefined, sourceTargetIds: [] };
  }
  if (occurrence.targetId === undefined && occurrence.visualInstanceId === undefined) {
    return { status: "unavailable" };
  }

  const match = resolveRetainedTargets(snapshot.hitTargets, occurrence);
  if (match.status !== "matched") {
    return { status: "unavailable" };
  }

  const target = match.targets[0];
  return target === undefined
    ? { status: "unavailable" }
    : {
        status: "matched",
        context: createOccurrenceContext(target),
        sourceTargetIds: match.targets.map((candidate) => candidate.id)
      };
}

/**
 * Creates query context from one exact retained target.
 *
 * @param target - Retained target selected by occurrence identity.
 * @returns Query context carried by geometry authority methods.
 */
function createOccurrenceContext(
  target: QuireHitTarget
): QuireSelectionGeometryContext {
  const hit = target.interactionHit;
  const viewRegion = target.viewRegion ?? target.queryOwner?.region ?? hit?.region;
  const ownerSource = target.source ?? hit?.source;
  const ownerCapabilities = target.capabilities ?? hit?.capabilities;

  return {
    referenceRect: target.rect,
    ...(viewRegion === undefined ? {} : { viewRegion }),
    ...(target.queryOwner === undefined ? {} : { queryOwner: target.queryOwner }),
    ...(ownerSource === undefined ? {} : { ownerSource }),
    ...(ownerCapabilities === undefined ? {} : { ownerCapabilities })
  };
}
