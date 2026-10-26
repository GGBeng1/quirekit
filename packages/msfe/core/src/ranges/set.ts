import { RangeSet, RangeValue, type ChangeDesc } from "@quirekit/cm-state";
import type { SourceRange } from "./types";

/** @param range - Immutable feature range. @param changes - Source coordinate mapping.
 * @returns Mapped range or deletion, respecting explicit boundary affinity. */
export function mapSourceRange<T>(range: SourceRange<T>, changes: ChangeDesc): SourceRange<T> | null {
  let deleted = false;
  changes.iterChangedRanges((from, to) => {
    if (from < to && (range.from === range.to ? from < range.from && to > range.to : from <= range.from && to >= range.to)) deleted = true;
  });
  if (deleted && range.onDelete !== "keep") return null;
  const from = changes.mapPos(range.from, range.inclusiveStart ? -1 : 1);
  const to = changes.mapPos(range.to, range.inclusiveEnd ? 1 : -1);
  return { ...range, from, to: Math.max(from, to) };
}

/** Backend leaf used to share unaffected CM range chunks. */
class Entry<T> extends RangeValue {
  /** @param data - Author data with mapping policy. */
  constructor(readonly data: SourceRange<T>) {
    super(); this.startSide = data.inclusiveStart ? -1 : 1; this.endSide = data.inclusiveEnd ? 1 : -1;
    if (data.from === data.to && !(data.inclusiveStart && data.inclusiveEnd)) this.endSide = this.startSide;
  }
}

/** Immutable source range collection. Positions live in CM's indexed RangeSet, never in a second AST. */
export class SourceRangeSet<T> {
  /** @param ranges - Internal indexed values. */
  private constructor(private readonly ranges: RangeSet<Entry<T>>) {}
  /** @param ranges - Unique, valid source intervals. @returns Indexed immutable collection. */
  static from<T>(ranges: readonly SourceRange<T>[] = []): SourceRangeSet<T> {
    const seen = new Set<string>();
    for (const range of ranges) {
      if (!range.id || seen.has(range.id)) throw new Error(`duplicate-range: ${range.id}`);
      if (!Number.isInteger(range.from) || !Number.isInteger(range.to) || range.from < 0 || range.to < range.from) throw new RangeError("invalid-source-range");
      seen.add(range.id);
    }
    return new SourceRangeSet(RangeSet.of(ranges.map(range => new Entry(range).range(range.from, range.to)), true));
  }
  /** @param from - Inclusive query start. @param to - Inclusive query end. @returns Overlapping feature ranges. */
  between(from: number, to: number): readonly SourceRange<T>[] {
    const result: SourceRange<T>[] = [];
    this.ranges.between(from, to, (start, end, value) => { result.push({ ...value.data, from: start, to: end }); });
    return result;
  }
  /** @returns Explicit full collection snapshot; avoid using it in viewport work. */
  all(): readonly SourceRange<T>[] { return this.between(0, Number.MAX_SAFE_INTEGER); }
  /** @param changes - Mapping from preceding source. @returns Mapped collection sharing unaffected backend chunks. */
  map(changes: ChangeDesc): SourceRangeSet<T> {
    if (changes.empty) return this;
    const touched = new Map<string, SourceRange<T>>();
    let lower = Infinity, upper = -1;
    // Only ranges touching changed intervals need the stronger whole-replacement policy.
    changes.iterChangedRanges((from, to) => {
      lower = Math.min(lower, from); upper = Math.max(upper, to);
      for (const range of this.between(from, to)) touched.set(range.id, range);
    });
    const retained = this.ranges.update({ filterFrom: lower, filterTo: upper, filter: (_from, _to, entry) => !touched.has(entry.data.id) }).map(changes);
    const mapped = [...touched.values()].flatMap(range => {
      const next = mapSourceRange(range, changes);
      return next ? [new Entry(next).range(next.from, next.to)] : [];
    });
    return new SourceRangeSet(retained.update({ add: mapped, sort: true }));
  }
}
