import type { QuireDocumentRange } from "@quirekit/renderer";
import type {
  CreateQuireDisplayInvalidationProjectionOptions,
  QuireDisplayInvalidatedOwner,
  QuireDisplayInvalidationProjection,
  QuireDisplayInvalidationProjectionEscalation,
  QuireRetainedDisplayOwner,
  QuireRetainedDisplayOwnerLane
} from "./types";

/**
 * Projects one typed mounted-view update onto retained display owners.
 *
 * Layout/content updates are range-bounded only when the dirty range identifies
 * owner records. Overlay-only updates deliberately retain content owners. Any
 * missing identity or unbounded update is visible as an escalation rather than
 * silently falling back to a backend-specific redraw policy.
 *
 * @param options - Current owner index plus typed invalidation inputs.
 * @returns Shared content/overlay/viewport owner projection.
 */
export function createQuireDisplayInvalidationProjection(
  options: CreateQuireDisplayInvalidationProjectionOptions
): QuireDisplayInvalidationProjection {
  const updatePatch = options.updatePatch;
  const layoutDirtyRange = (
    options.layoutDirtyRange
    ?? updatePatch?.layoutDirtyRange
  );
  const dirtyRange = layoutDirtyRange?.changedRange;
  const escalations: QuireDisplayInvalidationProjectionEscalation[] = [];
  const contentInvalidated = updatePatch?.invalidatedProducts.includes("content") === true;
  const overlayInvalidated = updatePatch?.invalidatedProducts.includes("overlay") === true;
  const refreshViewportMembership = updatePatch?.invalidatedProducts.includes("viewport") === true;
  const broadCause = updatePatch?.causes.find(isQuireBroadDisplayInvalidationCause);
  const contentOwners = contentInvalidated
    ? broadCause === undefined
      ? resolveQuireContentInvalidatedOwners(
          options.ownerIndex.owners.filter((owner) =>
            owner.kind !== "page-chrome" && owner.lanes.includes("content")
          ),
          dirtyRange,
          escalations
        )
      : resolveQuireBroadContentInvalidatedOwners(
          options.ownerIndex.owners,
          broadCause,
          escalations
        )
    : [];
  const overlayOwners = overlayInvalidated
    ? options.ownerIndex.owners
    : [];

  if (updatePatch === undefined || updatePatch === null) {
    escalations.push({
      code: "missing-update-patch",
      message: "Display invalidation has no typed update patch; all retained owner lanes are refreshed."
    });
    return {
      updatePatch,
      owners: options.ownerIndex.owners.map((owner) => ({
        ownerKey: owner.key,
        lanes: owner.lanes
      })),
      causes: [],
      refreshViewportMembership: true,
      escalations
    };
  }

  if (options.ownerIndex.gaps.length > 0) {
    escalations.push({
      code: "owner-identity-gap",
      message: `Display-owner compilation rejected ${options.ownerIndex.gaps.length} bounded product(s).`
    });
  }

  const identityGaps = layoutDirtyRange?.identityGaps ?? [];
  if (identityGaps.length > 0) {
    escalations.push({
      code: "invalidation-identity-gap",
      message: `Layout invalidation exposed identity gap(s): ${identityGaps
        .map((gap) => gap.code)
        .join(", ")}.`
    });
  }

  return {
    updatePatch,
    owners: mergeQuireInvalidatedOwnerLanes(contentOwners, overlayOwners),
    causes: updatePatch.causes,
    refreshViewportMembership,
    escalations
  };
}

/**
 * Reports whether an invalidation cause changes broad paint dependencies.
 *
 * @param cause - Canonical mounted-view invalidation cause.
 * @returns Whether every persistent owner must refresh explicitly.
 */
function isQuireBroadDisplayInvalidationCause(
  cause: QuireDisplayInvalidationProjection["causes"][number]
): boolean {
  return cause === "width-change" ||
    cause === "font-epoch" ||
    cause === "image-epoch" ||
    cause === "image-paint" ||
    cause === "fallback";
}

/**
 * Selects all persistent owners for a named broad paint-dependency change.
 *
 * @param owners - Current retained display owners.
 * @param cause - Broad invalidation cause that prevents bounded reuse.
 * @param escalations - Mutable explicit escalation output.
 * @returns Every owner carrying a persistent content lane.
 */
function resolveQuireBroadContentInvalidatedOwners(
  owners: readonly QuireRetainedDisplayOwner[],
  cause: QuireDisplayInvalidationProjection["causes"][number],
  escalations: QuireDisplayInvalidationProjectionEscalation[]
): readonly QuireRetainedDisplayOwner[] {
  escalations.push({
    code: "broad-invalidation",
    message: `Display invalidation cause "${cause}" refreshes every persistent owner explicitly.`
  });
  return owners.filter((owner) => owner.lanes.includes("content"));
}

/**
 * Resolves content owners from a canonical dirty range or escalates safely.
 *
 * @param owners - All current retained display owners.
 * @param dirtyRange - Optional precise layout dirty range.
 * @param escalations - Mutable explicit escalation output.
 * @returns Owners whose content lanes must be rebuilt.
 */
function resolveQuireContentInvalidatedOwners(
  owners: readonly QuireRetainedDisplayOwner[],
  dirtyRange: QuireDocumentRange | null | undefined,
  escalations: QuireDisplayInvalidationProjectionEscalation[]
): readonly QuireRetainedDisplayOwner[] {
  if (dirtyRange === undefined || dirtyRange === null) {
    escalations.push({
      code: "missing-dirty-range",
      message: "Content invalidation has no bounded dirty range; all content owners are refreshed."
    });
    return owners;
  }

  const matchedOwners = owners.filter((owner) =>
    doQuireDocumentRangesIntersect(owner.range, dirtyRange)
  );

  if (matchedOwners.length > 0) {
    const requiredOwnerKeys = new Set<string>();
    for (const owner of matchedOwners) {
      requiredOwnerKeys.add(owner.key);
      for (const ancestorOwnerKey of owner.ancestorOwnerKeys) {
        requiredOwnerKeys.add(ancestorOwnerKey);
      }
    }
    return owners.filter((owner) => requiredOwnerKeys.has(owner.key));
  }

  escalations.push({
    code: "dirty-range-owner-miss",
    message: "The bounded dirty range matched no retained display owner; all content owners are refreshed."
  });
  return owners;
}

/**
 * Merges content and overlay selections into deterministic owner updates.
 *
 * @param contentOwners - Owners selected for persistent content refresh.
 * @param overlayOwners - Owners selected for transient overlay refresh.
 * @returns One owner update per stable key.
 */
function mergeQuireInvalidatedOwnerLanes(
  contentOwners: readonly QuireRetainedDisplayOwner[],
  overlayOwners: readonly QuireRetainedDisplayOwner[]
): readonly QuireDisplayInvalidatedOwner[] {
  const lanesByOwner = new Map<string, Set<QuireRetainedDisplayOwnerLane>>();
  const order: string[] = [];

  appendQuireInvalidatedOwnerLanes(contentOwners, "content", lanesByOwner, order);
  appendQuireInvalidatedOwnerLanes(overlayOwners, "overlay", lanesByOwner, order);

  return order.map((ownerKey) => ({
    ownerKey,
    lanes: [...lanesByOwner.get(ownerKey)!]
  }));
}

/**
 * Adds one lane to each selected owner while preserving source order.
 *
 * @param owners - Retained owners receiving one invalidated lane.
 * @param lane - Paint lane to add.
 * @param lanesByOwner - Mutable lane sets keyed by owner key.
 * @param order - Mutable stable owner-key order.
 */
function appendQuireInvalidatedOwnerLanes(
  owners: readonly QuireRetainedDisplayOwner[],
  lane: QuireRetainedDisplayOwnerLane,
  lanesByOwner: Map<string, Set<QuireRetainedDisplayOwnerLane>>,
  order: string[]
): void {
  for (const owner of owners) {
    let lanes = lanesByOwner.get(owner.key);
    if (lanes === undefined) {
      lanes = new Set<QuireRetainedDisplayOwnerLane>();
      lanesByOwner.set(owner.key, lanes);
      order.push(owner.key);
    }
    lanes.add(lane);
  }
}

/**
 * Checks whether two document ranges overlap, including collapsed caret edits.
 *
 * @param left - First document range.
 * @param right - Second document range.
 * @returns Whether the ranges share a document position.
 */
function doQuireDocumentRangesIntersect(
  left: QuireDocumentRange,
  right: QuireDocumentRange
): boolean {
  if (left.from === left.to) {
    return left.from >= right.from && left.from <= right.to;
  }

  if (right.from === right.to) {
    return right.from >= left.from && right.from <= left.to;
  }

  return left.from < right.to && right.from < left.to;
}
