import { EditorView, type Rect } from "@quirekit/cm-view";
import type { RangeSet, RangeValue } from "@quirekit/cm-state";
import type { SourceClientPoint } from "./types";
import { sourceSlotCaret } from "./slot";

/** @param sets - Current indexed replacement ranges. @param initial - Native source hit. @param bias - Boundary preference. @returns An atomic boundary, never a hidden interior. */
function atomicBoundary(sets: readonly RangeSet<RangeValue>[], initial: number, bias: -1 | 0 | 1): number {
  let pos = initial, direction = bias;
  // Once a side is chosen, overlapping ranges can only move monotonically;
  // each index lookup examines the current endpoint, never the whole source.
  for (;;) {
    const before = pos;
    for (const set of sets) set.between(pos, pos, (from, to) => {
      if (from < pos && pos < to) {
        direction ||= pos - from < to - pos ? -1 : 1;
        pos = direction < 0 ? from : to;
      }
    });
    if (pos === before) return pos;
  }
}

/** @param view - Mounted geometry authority. @param pos - Legal source boundary. @param side - Visible association. @param sets - Already read atomic indexes when hit testing. @returns A real text caret or empty line, excluding replacement buffers and collapsed rows. */
function visibleCaret(view: EditorView, pos: number, side: -1 | 1, sets?: readonly RangeSet<RangeValue>[]): Rect | null {
  if (!view.visibleRanges.some(range => range.from <= pos && pos <= range.to)) return null;
  const dom = view.domAtPos(pos, side), { node } = dom;
  const element = node.nodeType === 1 ? node as Element : node.parentElement;
  const line = element?.closest(".cm-line");
  // Text ranges on a zero-height row may retain the font's phantom rectangle.
  // A caret needs a mounted line as well as its own real text geometry.
  if (!line || line.getBoundingClientRect().height < 1) return null;
  if (node.nodeType !== 3) {
    const slot = sourceSlotCaret(view, pos, dom, side);
    if (slot) return slot;
    // A hidden replacement's buffer can inherit the full flex-row height.
    // Its element boundary is not editable text, even when CM supplies a rect.
    let replacement = false;
    for (const set of sets ?? view.state.facet(EditorView.atomicRanges).map(provider => provider(view))) {
      set.between(pos, pos, (from, to) => { if (from <= pos && pos <= to && from < to) replacement = true; });
    }
    if (replacement) return null;
  }
  const caret = view.coordsAtPos(pos, side);
  return caret && caret.bottom - caret.top >= 1 ? caret : null;
}

/** @param view - Mounted layout owner. @param pos - Candidate endpoint. @param side - Preferred text association. @param sets - Reusable local atomic indexes. @returns The first legal text side, without measuring a replacement buffer. */
function boundaryCaret(view: EditorView, pos: number, side: -1 | 1, sets?: readonly RangeSet<RangeValue>[]): Rect | null {
  return visibleCaret(view, pos, side, sets) ?? visibleCaret(view, pos, side === 1 ? -1 : 1, sets);
}

/** @param rect - Actual text caret in client space. @param point - Pointer sample in the same space. @returns Squared distance to the vertical caret segment. */
function caretDistance(rect: Rect, point: SourceClientPoint): number {
  const dy = Math.max(rect.top - point.y, point.y - rect.bottom, 0);
  return dy * dy + (rect.left - point.x) ** 2;
}

/** @param view - Native layout owner. @param sets - Current atomic indexes. @param pos - Already normalized endpoint. @param side - Preferred text association. @param point - Pointer sample for adjacent-edge ties. @returns The same legal endpoint or its nearest visible atomic edge. */
function resolveBoundary(view: EditorView, sets: readonly RangeSet<RangeValue>[], pos: number, side: -1 | 1, point: SourceClientPoint): { pos: number; rect: Rect } | null {
  const direct = boundaryCaret(view, pos, side, sets);
  if (direct) return { pos, rect: direct };
  // At an outer cell/prefix edge neither association may own text. Try only
  // intersecting replacement endpoints before considering other source rows.
  const edges = new Map<number, -1 | 1>();
  for (const set of sets) set.between(pos, pos, (from, to) => {
    if (from >= to) return;
    edges.set(atomicBoundary(sets, from, -1), -1); edges.set(atomicBoundary(sets, to, 1), 1);
  });
  let nearest: { pos: number; rect: Rect } | null = null, distance = Infinity;
  for (const [edge, association] of edges) {
    if (edge === pos) continue;
    const rect = boundaryCaret(view, edge, association, sets);
    if (!rect) continue;
    const score = caretDistance(rect, point);
    if (score < distance) { nearest = { pos: edge, rect }; distance = score; }
  }
  return nearest;
}

/**
 * Measures a mounted text caret, trying the other association only at a hidden boundary.
 * @param view - Canonical source and mounted layout authority.
 * @param pos - Accepted source endpoint.
 * @param side - Preferred native bidi/line association.
 * @returns A proven positive-height caret, or null until its source is mounted and visible.
 */
export function sourceCaretRect(view: EditorView, pos: number, side: -1 | 1 = 1): Rect | null {
  return boundaryCaret(view, pos, side);
}

/**
 * Captures the visible text association once when transient input begins.
 * @param view - Current source and mounted text owner.
 * @param pos - Canonical insertion position.
 * @param side - Existing native association preference.
 * @returns The legal text side, or null if neither side is currently visible.
 */
export function sourceCaretSide(view: EditorView, pos: number, side: -1 | 1): -1 | 1 | null {
  if (visibleCaret(view, pos, side)) return side;
  const other = side === 1 ? -1 : 1;
  return visibleCaret(view, pos, other) ? other : null;
}

/**
 * Accepts only rendered caret boundaries, including native atomic replacement semantics.
 * @param view - Canonical source and mounted layout owner.
 * @param point - Adjusted pointer in client CSS pixels.
 * @returns A visible source boundary, or null to retain the last accepted selection.
 */
export function sourceInputPosition(view: EditorView, point: SourceClientPoint): number | null {
  const hit = view.posAtCoords(point);
  if (hit === null) return null;
  const sets = view.state.facet(EditorView.atomicRanges).map(provider => provider(view));
  const pos = atomicBoundary(sets, hit, 0);
  const accepted = resolveBoundary(view, sets, pos, pos < hit ? -1 : 1, point);
  if (accepted) return accepted.pos;
  let before: { pos: number; rect: NonNullable<ReturnType<typeof visibleCaret>> } | undefined;
  let after: typeof before;
  // Only an invisible hit enters the mounted-line fallback. Source line blocks
  // already skip folded/replaced interiors and never scan virtualized text.
  for (const block of view.viewportLineBlocks) for (const [candidate, side] of [[block.from, 1], [block.to, -1]] as const) {
    const boundary = resolveBoundary(view, sets, atomicBoundary(sets, candidate, side), side, point);
    if (!boundary) continue;
    if (boundary.pos <= hit && (!before || boundary.pos > before.pos)) before = boundary;
    if (boundary.pos >= hit && (!after || boundary.pos < after.pos)) after = boundary;
  }
  let nearest: number | null = null, distance = Infinity;
  // Compare only the two legal sides of this gap. Horizontal distance must not
  // send the endpoint backwards to an unrelated earlier paragraph's start.
  for (const candidate of [before, after]) if (candidate) {
    const { rect } = candidate;
    const score = caretDistance(rect, point);
    if (score < distance) { nearest = candidate.pos; distance = score; }
  }
  return nearest;
}
