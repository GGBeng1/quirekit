import type { FlowchartWorldBounds } from "../../navigation/types";
/** Dynamic world-bound union: logarithmic point edits and constant-time total bounds. */
export class OverviewBoundsIndex {
  private capacity = 16;
  private next = 0;
  private readonly slots = new Map<string, number>();
  private readonly free: number[] = [];
  private tree: Float64Array;
  /** @param entries - Initial node rectangles, installed bottom-up in linear time. */
  constructor(entries: readonly (readonly [string, FlowchartWorldBounds])[] = []) {
    while (this.capacity < entries.length) this.capacity *= 2;
    this.tree = this.allocate();
    entries.forEach(([id, bounds], i) => { this.slots.set(id, i); this.leaf(i, bounds); });
    this.next = entries.length; this.rebuild();
  }
  /** @returns Empty min/min/max/max union slots; missing leaves are neutral elements. */
  private allocate(): Float64Array {
    const tree = new Float64Array(this.capacity * 8);
    for (let i = 0; i < this.capacity * 2; i++) tree.set([Infinity, Infinity, -Infinity, -Infinity], i * 4);
    return tree;
  }
  /** @param slot - Stable leaf slot. @param bounds - New world bounds or a removed leaf. */
  private leaf(slot: number, bounds?: FlowchartWorldBounds): void {
    this.tree.set(bounds ? [bounds.x, bounds.y, bounds.x + bounds.width, bounds.y + bounds.height] : [Infinity, Infinity, -Infinity, -Infinity], (this.capacity + slot) * 4);
  }
  /** @param i - Parent union index. */
  private merge(i: number): void {
    const t = this.tree, a = i * 8, b = a + 4, p = i * 4;
    t[p] = Math.min(t[a]!, t[b]!); t[p + 1] = Math.min(t[a + 1]!, t[b + 1]!);
    t[p + 2] = Math.max(t[a + 2]!, t[b + 2]!); t[p + 3] = Math.max(t[a + 3]!, t[b + 3]!);
  }
  /** Rebuilds internal unions after initial load or capacity growth, never during a geometry edit. */
  private rebuild(): void { for (let i = this.capacity - 1; i > 0; i--) this.merge(i); }
  /** @param slot - Changed leaf. Updates only its ancestor path. */
  private update(slot: number): void { for (let i = Math.floor((this.capacity + slot) / 2); i > 0; i = Math.floor(i / 2)) this.merge(i); }
  /** @param id - Stable node identity. @param bounds - New world rectangle. */
  set(id: string, bounds: FlowchartWorldBounds): void {
    let slot = this.slots.get(id);
    if (slot === undefined) { slot = this.free.pop() ?? this.next++; this.slots.set(id, slot); }
    if (slot >= this.capacity) {
      // Only insertion can grow the index. Existing leaf slots remain stable,
      // so dragging never scans the other nodes or reallocates the tree.
      const old = this.tree, previous = this.capacity; this.capacity *= 2; this.tree = this.allocate();
      this.tree.set(old.subarray(previous * 4), this.capacity * 4); this.rebuild();
    }
    this.leaf(slot, bounds); this.update(slot);
  }
  /** @param id - Removed identity; its slot can be reused without growing memory. */
  remove(id: string): void {
    const slot = this.slots.get(id); if (slot === undefined) return;
    this.slots.delete(id); this.free.push(slot); this.leaf(slot); this.update(slot);
  }
  /** @returns Current world union, or no bounds for an empty diagram. */
  bounds(): FlowchartWorldBounds | undefined {
    const t = this.tree; return Number.isFinite(t[4]) ? { x: t[4]!, y: t[5]!, width: t[6]! - t[4]!, height: t[7]! - t[5]! } : undefined;
  }
}
