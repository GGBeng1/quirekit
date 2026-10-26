import {
  createEditorUINodeIdentityKey,
  isValidEditorUINodeIdentity,
  isValidEditorUINodeOrderFact
} from "../node-identity";
import type { EditorUINodeOrderFact } from "../node-identity";
import type {
  CreateEditorUINodeRangeSelectionOptions,
  EditorUINodeRangeSelectionRejection,
  EditorUINodeRangeSelectionSnapshot
} from "./types";

/**
 * Resolves immutable range facts without retaining caller-owned arrays.
 *
 * @param options - Version, direction, identities, and ordered occurrence facts.
 * @returns Immutable snapshot facts or an explicit rejection.
 */
export function resolveEditorUINodeRangeSelectionSnapshot(
  options: CreateEditorUINodeRangeSelectionOptions
): EditorUINodeRangeSelectionSnapshot | EditorUINodeRangeSelectionRejection {
  if (!Number.isSafeInteger(options.snapshotVersion) || options.snapshotVersion < 0) {
    return rejection(options.snapshotVersion, "invalid-snapshot-version");
  }
  if (
    !isValidEditorUINodeIdentity(options.anchor)
    || !isValidEditorUINodeIdentity(options.focus)
    || options.nodes.some((fact) => !isValidEditorUINodeOrderFact(fact))
  ) {
    return rejection(options.snapshotVersion, "invalid-node-fact");
  }
  if (options.anchor.rootId !== options.focus.rootId) {
    return {
      status: "rejected",
      reason: "cross-root",
      snapshotVersion: options.snapshotVersion,
      anchorRootId: options.anchor.rootId,
      focusRootId: options.focus.rootId
    };
  }

  const ordered = [...options.nodes].sort((left, right) => left.order - right.order);
  const validation = validateUniqueFacts(ordered, options.snapshotVersion);
  if (validation !== undefined) return validation;

  const anchorIndex = findIdentityIndex(ordered, options.anchor);
  if (anchorIndex < 0) {
    return unavailable(options.snapshotVersion, options.anchor);
  }
  const focusIndex = findIdentityIndex(ordered, options.focus);
  if (focusIndex < 0) {
    return unavailable(options.snapshotVersion, options.focus);
  }
  const direction = anchorIndex <= focusIndex ? "forward" : "backward";
  const members = ordered.slice(
    Math.min(anchorIndex, focusIndex),
    Math.max(anchorIndex, focusIndex) + 1
  ).map(cloneFact);

  return Object.freeze({
    snapshotVersion: options.snapshotVersion,
    rootId: options.anchor.rootId,
    writingDirection: options.writingDirection,
    direction,
    visualDirection: options.writingDirection === "rtl"
      ? invertDirection(direction)
      : direction,
    anchor: Object.freeze({ ...options.anchor }),
    focus: Object.freeze({ ...options.focus }),
    members: Object.freeze(members)
  });
}

/**
 * Validates unique identities and structural order values.
 *
 * @param facts - Sorted occurrence facts.
 * @param snapshotVersion - Version used by a rejection.
 * @returns First uniqueness rejection, or undefined.
 */
function validateUniqueFacts(
  facts: readonly EditorUINodeOrderFact[],
  snapshotVersion: number
): EditorUINodeRangeSelectionRejection | undefined {
  const identities = new Set<string>();
  const orders = new Set<number>();
  for (const fact of facts) {
    const key = createEditorUINodeIdentityKey(fact.identity);
    if (identities.has(key)) {
      return {
        status: "rejected",
        reason: "duplicate-identity",
        snapshotVersion,
        identity: { ...fact.identity }
      };
    }
    if (orders.has(fact.order)) {
      return { status: "rejected", reason: "duplicate-order", snapshotVersion, order: fact.order };
    }
    identities.add(key);
    orders.add(fact.order);
  }
  return undefined;
}

/**
 * Finds one stable identity in ordered occurrence facts.
 *
 * @param facts - Ordered facts to search.
 * @param identity - Stable identity to find.
 * @returns Fact index, or -1 when unavailable.
 */
function findIdentityIndex(
  facts: readonly EditorUINodeOrderFact[],
  identity: EditorUINodeOrderFact["identity"]
): number {
  const key = createEditorUINodeIdentityKey(identity);
  return facts.findIndex((fact) => createEditorUINodeIdentityKey(fact.identity) === key);
}

/**
 * Clones and freezes one caller-owned occurrence fact.
 *
 * @param fact - Occurrence fact to clone.
 * @returns Immutable occurrence fact.
 */
function cloneFact(fact: EditorUINodeOrderFact): EditorUINodeOrderFact {
  return Object.freeze({
    identity: Object.freeze({ ...fact.identity }),
    order: fact.order,
    range: Object.freeze({ ...fact.range })
  });
}

/**
 * Inverts one direction for RTL visual navigation.
 *
 * @param direction - Document-order direction.
 * @returns Opposite visual direction.
 */
function invertDirection(
  direction: EditorUINodeRangeSelectionSnapshot["direction"]
): EditorUINodeRangeSelectionSnapshot["direction"] {
  return direction === "forward" ? "backward" : "forward";
}

/**
 * Creates a simple rejection without extra facts.
 *
 * @param snapshotVersion - Rejected snapshot version.
 * @param reason - Stable rejection reason.
 * @returns Structural-range rejection.
 */
function rejection(
  snapshotVersion: number,
  reason: "invalid-snapshot-version" | "invalid-node-fact"
): EditorUINodeRangeSelectionRejection {
  return { status: "rejected", reason, snapshotVersion };
}

/**
 * Creates an identity-unavailable rejection.
 *
 * @param snapshotVersion - Rejected snapshot version.
 * @param identity - Stable endpoint that could not be restored.
 * @returns Structural-range rejection.
 */
function unavailable(
  snapshotVersion: number,
  identity: EditorUINodeOrderFact["identity"]
): EditorUINodeRangeSelectionRejection {
  return {
    status: "rejected",
    reason: "identity-unavailable",
    snapshotVersion,
    identity: { ...identity }
  };
}
