import type {
  QuireLayoutHeightDelta,
  QuireLayoutHeightIndex,
  QuireLayoutHeightIndexEntry,
  QuireLayoutHeightIndexUpdate
} from "./types";

/** Fenwick-tree implementation of the retained top-level height index. */
export class QuireFenwickLayoutHeightIndex implements QuireLayoutHeightIndex {
  /** Stable ids in current document order. */
  private ids: string[] = [];

  /** Current exact extents by zero-based index. */
  private extents: number[] = [];

  /** One-based Fenwick tree containing extent prefix sums. */
  private tree: number[] = [0];

  /** @inheritdoc */
  get size(): number {
    return this.ids.length;
  }

  /** @inheritdoc */
  reconcile(entries: readonly QuireLayoutHeightIndexEntry[]): QuireLayoutHeightIndexUpdate {
    validateEntries(entries);
    if (!this.hasSameIdentityOrder(entries)) {
      this.rebuild(entries);
      return { mode: "rebuild", updatedEntries: entries.length };
    }

    const deltas: QuireLayoutHeightDelta[] = [];
    for (let index = 0; index < entries.length; index += 1) {
      const delta = entries[index]!.extent - this.extents[index]!;
      if (delta !== 0) {
        deltas.push({ index, delta });
      }
    }
    if (deltas.length === 0) {
      return { mode: "noop", updatedEntries: 0 };
    }

    this.applyDeltas(deltas);
    return { mode: "delta", updatedEntries: deltas.length };
  }

  /** @inheritdoc */
  applyDeltas(deltas: readonly QuireLayoutHeightDelta[]): void {
    const combined = combineDeltas(deltas, this.extents.length);
    for (const [index, delta] of combined) {
      const next = this.extents[index]! + delta;
      if (!Number.isFinite(next) || next < 0) {
        throw new RangeError(`Height delta produces a negative extent at index ${index}.`);
      }
    }

    // Validate the whole batch before mutating either exact extents or Fenwick
    // nodes, so a rejected update cannot leave a partially committed index.
    for (const [index, delta] of combined) {
      this.extents[index] = this.extents[index]! + delta;
      this.add(index, delta);
    }
  }

  /** @inheritdoc */
  blockTop(index: number): number {
    assertIndex(index, this.extents.length);
    return this.prefixSum(index);
  }

  /** @inheritdoc */
  totalHeight(): number {
    return this.prefixSum(this.extents.length);
  }

  /** @inheritdoc */
  blockIndexAtOffset(offset: number): number | undefined {
    const total = this.totalHeight();
    if (!Number.isFinite(offset) || offset < 0 || offset >= total) {
      return undefined;
    }

    // Fenwick binary lifting finds the largest prefix not greater than the
    // offset. Exact boundaries therefore resolve to the following block.
    let treeIndex = 0;
    let prefix = 0;
    let bit = highestPowerOfTwoAtMost(this.extents.length);
    while (bit !== 0) {
      const candidate = treeIndex + bit;
      if (candidate <= this.extents.length) {
        const candidatePrefix = prefix + this.tree[candidate]!;
        if (candidatePrefix <= offset) {
          treeIndex = candidate;
          prefix = candidatePrefix;
        }
      }
      bit >>= 1;
    }
    return Math.min(treeIndex, this.extents.length - 1);
  }

  /** Rebuilds exact extents and every Fenwick node from current entries. */
  private rebuild(entries: readonly QuireLayoutHeightIndexEntry[]): void {
    this.ids = entries.map((entry) => entry.id);
    this.extents = entries.map((entry) => entry.extent);
    this.tree = new Array(entries.length + 1).fill(0);
    for (let index = 0; index < this.extents.length; index += 1) {
      this.add(index, this.extents[index]!);
    }
  }

  /** Checks whether current entries preserve exact retained identity order. */
  private hasSameIdentityOrder(entries: readonly QuireLayoutHeightIndexEntry[]): boolean {
    if (entries.length !== this.ids.length) {
      return false;
    }
    for (let index = 0; index < entries.length; index += 1) {
      if (entries[index]!.id !== this.ids[index]) {
        return false;
      }
    }
    return true;
  }

  /** Adds one delta to a zero-based extent and all containing Fenwick nodes. */
  private add(index: number, delta: number): void {
    for (let treeIndex = index + 1; treeIndex < this.tree.length; treeIndex += treeIndex & -treeIndex) {
      this.tree[treeIndex]! += delta;
    }
  }

  /** Returns the sum of extents in the half-open range `[0, end)`. */
  private prefixSum(end: number): number {
    let sum = 0;
    for (let treeIndex = end; treeIndex > 0; treeIndex -= treeIndex & -treeIndex) {
      sum += this.tree[treeIndex]!;
    }
    return sum;
  }
}

/**
 * Creates an empty internal prefix-sum height index.
 *
 * @returns Height index for one retained top-level flow.
 */
export function createQuireLayoutHeightIndex(): QuireLayoutHeightIndex {
  return new QuireFenwickLayoutHeightIndex();
}

/** Validates non-negative finite entries and unique stable ids. */
function validateEntries(entries: readonly QuireLayoutHeightIndexEntry[]): void {
  const ids = new Set<string>();
  for (const entry of entries) {
    if (ids.has(entry.id)) {
      throw new Error(`Duplicate height-index identity: ${entry.id}`);
    }
    if (!Number.isFinite(entry.extent) || entry.extent < 0) {
      throw new RangeError(`Invalid height-index extent for ${entry.id}.`);
    }
    ids.add(entry.id);
  }
}

/** Combines duplicate delta indices without mutating the index. */
function combineDeltas(
  deltas: readonly QuireLayoutHeightDelta[],
  size: number
): ReadonlyMap<number, number> {
  const combined = new Map<number, number>();
  for (const delta of deltas) {
    assertIndex(delta.index, size);
    if (!Number.isFinite(delta.delta)) {
      throw new RangeError(`Invalid height delta at index ${delta.index}.`);
    }
    combined.set(delta.index, (combined.get(delta.index) ?? 0) + delta.delta);
  }
  return combined;
}

/** Validates a zero-based extent index. */
function assertIndex(index: number, size: number): void {
  if (!Number.isInteger(index) || index < 0 || index >= size) {
    throw new RangeError(`Height-index position ${index} is outside 0-${size - 1}.`);
  }
}

/** Returns the highest power of two not greater than the supplied size. */
function highestPowerOfTwoAtMost(size: number): number {
  let bit = 1;
  while ((bit << 1) <= size) {
    bit <<= 1;
  }
  return size === 0 ? 0 : bit;
}
