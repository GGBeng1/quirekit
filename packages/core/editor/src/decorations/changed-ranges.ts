import type {
  Decoration as PMDecoration,
  Node as PMNode,
  Transaction
} from "@quirekit/pm";
import { getChangedRanges } from "../helpers/getChangedRanges";
import type { QuireRange } from "../types";
import type { Decoration } from "./decoration";

/** Changed-range resolution used by the incremental decoration policy. */
export type DecorationRebuildRanges =
  | { readonly type: "ranges"; readonly ranges: readonly QuireRange[] }
  | { readonly type: "full" };

/**
 * Expands transaction changes to merged top-level block ranges.
 *
 * Unresolvable attribute-only or custom steps deliberately fall back to a full
 * rebuild so incremental optimization can never leave stale decorations.
 *
 * @param tr - Transaction being applied.
 * @param doc - Document after the transaction.
 * @returns Changed block ranges or a correctness-preserving full fallback.
 */
export function resolveDecorationRebuildRanges(
  tr: Transaction,
  doc: PMNode
): DecorationRebuildRanges {
  const changed = getChangedRanges(tr).map(({ newRange }) => newRange);

  if (tr.docChanged && changed.length === 0) {
    return { type: "full" };
  }

  const blockRanges = changed
    .map((range) => findTopLevelBlockRange(doc, range))
    .filter((range): range is QuireRange => range !== null)
    .sort((left, right) => left.from - right.from);

  return { type: "ranges", ranges: mergeRanges(blockRanges) };
}

/**
 * Checks whether a block range owns a decoration anchor.
 *
 * @param position - Decoration anchor.
 * @param range - Rebuilt top-level block range.
 * @param docSize - Document content size.
 * @returns Whether the anchor is removed and recreated with this range.
 */
export function decorationRangeOwnsPosition(
  position: number,
  range: QuireRange,
  docSize: number
): boolean {
  return position >= range.from &&
    (position < range.to || (position === range.to && range.to === docSize));
}

/**
 * Keeps only decorations whose anchors belong to a requested rebuild range.
 *
 * @param decorations - Decorations returned by `createInRange()`.
 * @param range - Exact range assigned to the callback.
 * @param docSize - Current document content size.
 * @returns Decorations owned by the range.
 */
export function keepOwnedDecorations(
  decorations: readonly Decoration[],
  range: QuireRange,
  docSize: number
): Decoration[] {
  return decorations.filter((decoration) =>
    decorationRangeOwnsPosition(decoration.anchor, range, docSize)
  );
}

/**
 * Selects stale ProseMirror decorations owned by a rebuilt range.
 *
 * @param decorations - Decorations intersecting the requested range.
 * @param range - Exact rebuilt range.
 * @param docSize - Current document content size.
 * @returns Decorations that must be removed before adding replacements.
 */
export function selectStaleDecorations(
  decorations: readonly PMDecoration[],
  range: QuireRange,
  docSize: number
): PMDecoration[] {
  return decorations.filter((decoration) =>
    decorationRangeOwnsPosition(decoration.from, range, docSize)
  );
}

/**
 * Finds the contiguous top-level block span touched by a document range.
 *
 * @param doc - Current document.
 * @param changed - Changed document range.
 * @returns Covering top-level block range, or null for an empty document.
 */
function findTopLevelBlockRange(
  doc: PMNode,
  changed: QuireRange
): QuireRange | null {
  let from: number | null = null;
  let to = 0;
  let position = 0;

  for (let index = 0; index < doc.childCount; index += 1) {
    if (position > changed.to) {
      break;
    }

    const end = position + doc.child(index).nodeSize;

    if (end >= changed.from) {
      from ??= position;
      to = end;
    }

    position = end;
  }

  return from === null ? null : { from, to };
}

/**
 * Merges sorted overlapping ranges.
 *
 * @param ranges - Sorted document ranges.
 * @returns Minimal non-overlapping range collection.
 */
function mergeRanges(ranges: readonly QuireRange[]): QuireRange[] {
  const result: { from: number; to: number }[] = [];

  for (const range of ranges) {
    const previous = result.at(-1);

    if (previous && range.from <= previous.to) {
      previous.to = Math.max(previous.to, range.to);
    } else {
      result.push({ ...range });
    }
  }

  return result;
}
