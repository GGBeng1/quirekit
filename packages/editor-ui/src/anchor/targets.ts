import type {
  QuireHitTarget,
  QuireLayoutSnapshot,
  QuireViewInteractionHit
} from "@quirekit/view-engine";
import type {
  EditorUIAnchorGeometryResolution,
  EditorUIAnchorOccurrence,
  EditorUIAnchorRequest,
  EditorUINodeAnchorRequest,
  EditorUIObjectAnchorRequest,
  EditorUIWidgetAnchorRequest
} from "./types";
import { createEditorUIReadyAnchor, createEditorUIUnsupportedAnchor } from "./result";

/** One matched retained target list or an explicit absence/ambiguity reason. */
export type EditorUIRetainedTargetMatch =
  | { readonly status: "matched"; readonly targets: readonly QuireHitTarget[] }
  | { readonly status: "unavailable" }
  | { readonly status: "ambiguous" };

/**
 * Converts one retained semantic target match into a typed ready product.
 *
 * @param request - Node, object, or widget request represented by the targets.
 * @param match - Retained target match state.
 * @param snapshotVersion - Accepted current snapshot version.
 * @param unavailableReason - Reason used when no target matches.
 * @param ambiguousReason - Reason used for repeated occurrence ambiguity.
 * @returns Ready semantic target geometry or explicit unsupported result.
 */
export function resolveEditorUISemanticTargetAnchor(
  request: Extract<
    EditorUIAnchorRequest,
    { readonly kind: "node" | "object" | "widget" }
  >,
  match: EditorUIRetainedTargetMatch,
  snapshotVersion: number,
  unavailableReason:
    | "node-target-unavailable"
    | "object-target-unavailable"
    | "widget-target-unavailable",
  ambiguousReason:
    | "node-target-ambiguous"
    | "object-target-ambiguous"
    | "widget-target-ambiguous"
): EditorUIAnchorGeometryResolution {
  if (match.status !== "matched") {
    return createEditorUIUnsupportedAnchor(
      request,
      match.status === "ambiguous"
        ? ambiguousReason
        : request.occurrence === undefined
          ? unavailableReason
          : "occurrence-target-unavailable",
      snapshotVersion
    );
  }

  return createEditorUIReadyAnchor({
    request,
    snapshotVersion,
    rects: match.targets.map((target) => target.rect),
    sourceTargetIds: match.targets.map((target) => target.id)
  });
}

/**
 * Resolves node targets from canonical semantic interaction hits.
 *
 * @param snapshot - Retained render-time interaction snapshot.
 * @param request - Explicit node request.
 * @returns Exact retained target match state.
 */
export function resolveEditorUINodeTargets(
  snapshot: QuireLayoutSnapshot,
  request: EditorUINodeAnchorRequest
): EditorUIRetainedTargetMatch {
  return resolveRetainedTargets(
    snapshot.hitTargets.filter((target) =>
      target.interactionHit?.kind === "node"
      && target.interactionHit.nodeId === request.nodeId
    ),
    request.occurrence
  );
}

/**
 * Resolves object-body targets from canonical retained interaction hits.
 *
 * @param snapshot - Retained render-time interaction snapshot.
 * @param request - Explicit object request.
 * @returns Exact retained target match state.
 */
export function resolveEditorUIObjectTargets(
  snapshot: QuireLayoutSnapshot,
  request: EditorUIObjectAnchorRequest
): EditorUIRetainedTargetMatch {
  return resolveRetainedTargets(
    snapshot.hitTargets.filter((target) =>
      target.interactionHit?.kind === "object"
      && target.interactionHit.objectId === request.objectId
    ),
    request.occurrence
  );
}

/**
 * Resolves widget targets from canonical semantic interaction hits.
 *
 * @param snapshot - Retained render-time interaction snapshot.
 * @param request - Explicit widget request.
 * @returns Exact retained target match state.
 */
export function resolveEditorUIWidgetTargets(
  snapshot: QuireLayoutSnapshot,
  request: EditorUIWidgetAnchorRequest
): EditorUIRetainedTargetMatch {
  return resolveRetainedTargets(
    snapshot.hitTargets.filter((target) => {
      const hit = target.interactionHit;
      return hit?.kind === "widget"
        && hit.widgetId === request.widgetId
        && (request.part === undefined || hit.part === request.part);
    }),
    request.occurrence
  );
}

/**
 * Resolves an exact occurrence and rejects repeated visual ambiguity.
 *
 * @param targets - Semantic retained targets selected by capability identity.
 * @param occurrence - Optional exact target or visual occurrence.
 * @returns Match state with deterministic target order.
 */
export function resolveRetainedTargets(
  targets: readonly QuireHitTarget[],
  occurrence?: EditorUIAnchorOccurrence
): EditorUIRetainedTargetMatch {
  const filtered = filterTargetsByOccurrence(targets, occurrence);
  if (filtered.length === 0) {
    return { status: "unavailable" };
  }

  const occurrenceKeys = new Set(filtered.map(resolveTargetOccurrenceKey));
  if (filtered.length > 1 && occurrenceKeys.size > 1) {
    return { status: "ambiguous" };
  }

  return { status: "matched", targets: filtered };
}

/**
 * Reads the repeated visual identity carried by one retained target.
 *
 * @param target - Retained hit target to inspect.
 * @returns Exact visual instance id, or undefined for a non-repeated target.
 */
export function resolveTargetVisualInstanceId(
  target: QuireHitTarget
): string | undefined {
  return target.queryOwner?.region?.visualInstanceId
    ?? target.viewRegion?.visualInstanceId
    ?? target.interactionHit?.region.visualInstanceId;
}

/**
 * Filters retained targets by an explicit target id or visual occurrence.
 *
 * @param targets - Candidate retained targets.
 * @param occurrence - Optional exact occurrence requested by the caller.
 * @returns Targets belonging to that occurrence.
 */
function filterTargetsByOccurrence(
  targets: readonly QuireHitTarget[],
  occurrence?: EditorUIAnchorOccurrence
): readonly QuireHitTarget[] {
  if (occurrence === undefined) {
    return targets;
  }
  if (occurrence.targetId === undefined && occurrence.visualInstanceId === undefined) {
    return [];
  }

  return targets.filter((target) =>
    (occurrence.targetId === undefined || target.id === occurrence.targetId)
    && (
      occurrence.visualInstanceId === undefined
      || resolveTargetVisualInstanceId(target) === occurrence.visualInstanceId
    )
  );
}

/**
 * Creates the visual occurrence key used to reject ambiguous retained results.
 *
 * @param target - Retained target whose occurrence should be classified.
 * @returns Stable occurrence key.
 */
function resolveTargetOccurrenceKey(target: QuireHitTarget): string {
  return resolveTargetVisualInstanceId(target)
    ?? resolveInteractionRegionKey(target.interactionHit)
    ?? `target:${target.id}`;
}

/**
 * Creates a region key when a semantic target has no repeated visual identity.
 *
 * @param hit - Optional canonical interaction hit.
 * @returns Root/region key, or undefined when the target has no semantic owner.
 */
function resolveInteractionRegionKey(
  hit: QuireViewInteractionHit | undefined
): string | undefined {
  return hit === undefined
    ? undefined
    : `${hit.region.rootId.value}:${hit.region.regionId.value}`;
}
