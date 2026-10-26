import type { ClassicEditorUiSemanticSnapshot } from "../../types";

/** Creates the immutable semantic state before an editor publishes its first revision. */
export function createInitialClassicEditorSemanticSnapshot(): ClassicEditorUiSemanticSnapshot {
  return Object.freeze({
    selection: null,
    target: null,
    values: Object.freeze({}),
    mixed: Object.freeze([]),
    can: Object.freeze({}),
    reasons: Object.freeze({}),
    busy: Object.freeze([]),
    geometry: null,
    freshness: 0
  });
}

/**
 * Throws when one semantic producer does not supply an ordered safe revision.
 *
 * @param snapshot - Candidate semantic snapshot.
 */
export function assertClassicEditorSemanticFreshness(
  snapshot: ClassicEditorUiSemanticSnapshot
): void {
  if (!Number.isSafeInteger(snapshot.freshness) || snapshot.freshness < 0) {
    throw new RangeError("Classic Editor semantic freshness must be a non-negative safe integer.");
  }
}

/**
 * Copies every mutable semantic collection before the controller publishes it.
 * This is a phase boundary: all surfaces observe precisely one stable snapshot.
 *
 * @param snapshot - Caller-owned semantic snapshot.
 * @returns Frozen semantic snapshot safe to retain after the call.
 */
export function freezeClassicEditorSemanticSnapshot(
  snapshot: ClassicEditorUiSemanticSnapshot
): ClassicEditorUiSemanticSnapshot {
  return Object.freeze({
    selection: snapshot.selection === null ? null : Object.freeze({ ...snapshot.selection }),
    target: snapshot.target,
    values: freezeRecord(snapshot.values),
    mixed: Object.freeze([...snapshot.mixed]),
    can: Object.freeze({ ...snapshot.can }),
    reasons: Object.freeze({ ...snapshot.reasons }),
    busy: Object.freeze([...snapshot.busy]),
    geometry: snapshot.geometry === null ? null : Object.freeze({ ...snapshot.geometry }),
    freshness: snapshot.freshness
  });
}

/**
 * Compares producer revisions so duplicate semantic updates do not repaint surfaces.
 *
 * @param left - Previously published semantic snapshot.
 * @param right - Candidate next semantic snapshot.
 * @returns Whether both snapshots represent the same producer revision.
 */
export function haveSameClassicEditorSemanticFreshness(
  left: ClassicEditorUiSemanticSnapshot,
  right: ClassicEditorUiSemanticSnapshot
): boolean {
  return left.freshness === right.freshness;
}

/**
 * Copies and freezes a values map, including nested plain data used by product controls.
 *
 * @param values - Caller-owned semantic values.
 * @returns Immutable values map with immutable nested data.
 */
function freezeRecord(values: Readonly<Record<string, unknown>>): Readonly<Record<string, unknown>> {
  return Object.freeze(Object.fromEntries(Object.entries(values).map(([key, value]) => [
    key,
    freezeValue(value)
  ])));
}

/**
 * Freezes recursively serializable action state while preserving opaque host values.
 *
 * @param value - Candidate semantic value.
 * @returns Immutable copy for arrays and plain records, or the opaque value itself.
 */
function freezeValue(value: unknown): unknown {
  if (Array.isArray(value)) return Object.freeze(value.map(freezeValue));
  if (
    value !== null
    && typeof value === "object"
    && Object.getPrototypeOf(value) === Object.prototype
  ) return Object.freeze(Object.fromEntries(Object.entries(value).map(([key, item]) => [
    key,
    freezeValue(item)
  ])));
  return value;
}
