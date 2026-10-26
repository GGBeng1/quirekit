import type { Step, Transform } from "@quirekit/pm";
import type { QuireRange, Range } from "../types";

/** Old and new document ranges affected by a transform. */
export interface ChangedRange {
  /** Range in the old document. */
  oldRange: Range;
  /** Range in the new document. */
  newRange: Range;
}

/** Immutable QuireKit changed-range pair. */
export interface QuireChangedRange extends ChangedRange {
  /** Range in the old document. */
  readonly oldRange: QuireRange;
  /** Range in the new document. */
  readonly newRange: QuireRange;
}

/**
 * Simplifies changed ranges by removing duplicates and fully contained ranges.
 *
 * @param changes - Changed ranges to simplify.
 * @returns Simplified changed ranges.
 */
function simplifyChangedRanges(changes: ChangedRange[]): ChangedRange[] {
  // Compare both document spaces before containment. Distinct mark steps can
  // have identical endpoints; letting equal ranges contain each other would
  // discard every dirty range and leave retained content unchanged.
  const seen = new Set<string>();
  const uniqueChanges = changes.filter(({ oldRange, newRange }) => {
    const key = `${oldRange.from}:${oldRange.to}:${newRange.from}:${newRange.to}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  if (uniqueChanges.length === 1) {
    return uniqueChanges;
  }

  return uniqueChanges.filter((change, index) => {
    const rest = uniqueChanges.filter((_, itemIndex) => itemIndex !== index);

    return !rest.some((otherChange) => (
      change.oldRange.from >= otherChange.oldRange.from &&
      change.oldRange.to <= otherChange.oldRange.to &&
      change.newRange.from >= otherChange.newRange.from &&
      change.newRange.to <= otherChange.newRange.to
    ));
  });
}

/**
 * Gets document ranges changed by a transform.
 *
 * @param transform - Transform to inspect.
 * @returns Changed old/new ranges.
 */
export function getChangedRanges(transform: Transform): ChangedRange[] {
  const { mapping, steps } = transform;
  const changes: ChangedRange[] = [];

  mapping.maps.forEach((stepMap, index) => {
    const ranges: Range[] = [];
    const internalRanges = (stepMap as unknown as { readonly ranges?: readonly number[] }).ranges;

    if (!internalRanges || internalRanges.length === 0) {
      const { from, to } = steps[index] as Step & {
        /** Optional step start used by mark and attribute steps. */
        readonly from?: number;
        /** Optional step end used by mark and attribute steps. */
        readonly to?: number;
      };

      if (from === undefined || to === undefined) {
        return;
      }

      ranges.push({ from, to });
    } else {
      stepMap.forEach((from, to) => {
        ranges.push({ from, to });
      });
    }

    for (const { from, to } of ranges) {
      const newStart = mapping.slice(index).map(from, -1);
      const newEnd = mapping.slice(index).map(to);
      const oldStart = mapping.invert().map(newStart, -1);
      const oldEnd = mapping.invert().map(newEnd);

      changes.push({
        oldRange: { from: oldStart, to: oldEnd },
        newRange: { from: newStart, to: newEnd }
      });
    }
  });

  return simplifyChangedRanges(changes);
}
