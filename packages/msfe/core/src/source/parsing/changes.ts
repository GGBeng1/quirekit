import { syntaxTree } from "@quirekit/cm-language";
import type { ChangeDesc, EditorState } from "@quirekit/cm-state";
import { Tree, type TreeBuffer } from "@lezer/common";
import type { MsfeSourceRange } from "../../views/types";
import type { SyntaxChangeCache, SyntaxChangeWork } from "./types";
import { createChunkMatcher } from "./matcher";
import { createSyntaxReuseMatcher } from "./reuse";

const comparisons = new WeakMap<EditorState, WeakMap<EditorState, SyntaxChangeCache>>();
const workByState = new WeakMap<EditorState, SyntaxChangeWork>();

/** @param state - Accepted or speculative immutable state. @returns Detached comparison counters without starting a diff. */
export function getSyntaxChangeWork(state: EditorState): SyntaxChangeWork {
  return { ...workByState.get(state) ?? { builds: 0, visitedChunks: 0, comparedChunks: 0, reuseChecks: 0, reuseMappings: 0 } };
}

/** @param before - Prior state lineage. @param after - Next state, including selection-only updates. */
export function inheritSyntaxChangeWork(before: EditorState, after: EditorState): void {
  if (!workByState.has(after)) workByState.set(after, getSyntaxChangeWork(before));
}

/** @param ranges - Unordered changed intervals in the accepted document. @returns Disjoint sorted intervals, including deletion points. */
export function mergeSourceRanges(ranges: readonly MsfeSourceRange[]): readonly MsfeSourceRange[] {
  const result: { from: number; to: number }[] = [];
  for (const range of [...ranges].sort((a, b) => a.from - b.from || a.to - b.to)) {
    const previous = result.at(-1);
    if (previous && range.from <= previous.to) previous.to = Math.max(previous.to, range.to);
    else result.push({ ...range });
  }
  return result;
}

/**
 * Finds changed complete Markdown blocks using native immutable chunk reuse.
 * Anonymous balancing chunks are traversed only until a reused chunk is found;
 * a changed semantic block owns its entire subtree, including contextual children.
 * @param before - Previously accepted syntax and source.
 * @param after - Newly accepted syntax and source, possibly partially parsed.
 * @param changes - Exact mapping between the two source versions.
 * @returns New-coordinate dirty blocks and raw edits; no second AST or source copy.
 */
export function changedSyntaxRanges(before: EditorState, after: EditorState, changes: ChangeDesc): readonly MsfeSourceRange[] {
  const oldTree = syntaxTree(before), newTree = syntaxTree(after);
  let cache = comparisons.get(after);
  const previous = cache?.get(before);
  if (previous?.before === oldTree && previous.after === newTree) return previous.ranges;
  const work = getSyntaxChangeWork(before); work.builds++;
  const ranges = changedTreeRanges(oldTree, newTree, changes, after.doc.length, work);
  if (!cache) { cache = new WeakMap(); comparisons.set(after, cache); }
  cache.set(before, { before: oldTree, after: newTree, ranges }); workByState.set(after, work);
  return ranges;
}

/** @param previous - Old accepted parse. @param current - New accepted parse. @param changes - Exact source mapping.
 * @param length - Current canonical source length. @param work - Optional actual chunk counters.
 * @returns Complete changed blocks in new coordinates. */
export function changedTreeRanges(previous: Tree, current: Tree, changes: ChangeDesc, length: number,
  work: SyntaxChangeWork = { builds: 0, visitedChunks: 0, comparedChunks: 0, reuseChecks: 0, reuseMappings: 0 }): readonly MsfeSourceRange[] {
  const inverse = changes.invertedDesc, ranges: MsfeSourceRange[] = [];
  const retained = createChunkMatcher(previous, work);
  const adopted = createSyntaxReuseMatcher(previous, current, changes, work);
  changes.iterChangedRanges((_fromA, _toA, from, to) => ranges.push({ from, to }));
  /** @param chunk - Current parse chunk. @param from - Its accepted source origin. */
  function visit(chunk: Tree | TreeBuffer, from: number): void {
    work.visitedChunks++;
    const to = from + chunk.length;
    if (adopted(from, to)) return;
    const oldFrom = inverse.mapPos(from, 1), oldTo = inverse.mapPos(to, -1);
    if (oldTo - oldFrom === chunk.length && retained(oldFrom, chunk)) return;
    if (chunk instanceof Tree && (chunk.type.isAnonymous || chunk === current)) {
      chunk.children.forEach((child, index) => visit(child, from + chunk.positions[index]!));
    } else ranges.push({ from, to });
  }
  if (previous !== current) visit(current, 0);
  // An incomplete replacement tree must withdraw formerly confirmed output in its
  // unparsed tail. A later accepted parse adds that output through the same diff.
  if (current.length < length) ranges.push({ from: current.length, to: length });
  return mergeSourceRanges(ranges);
}

/** @param range - Projection owner in accepted coordinates. @param dirty - Changed complete blocks.
 * @returns Whether the owner overlaps changed syntax, including a deletion at its boundary. */
export function touchesSourceRanges(range: MsfeSourceRange, dirty: readonly MsfeSourceRange[]): boolean {
  return dirty.some(item => item.from === item.to ? range.from <= item.from && range.to >= item.to
    : range.from === range.to ? range.from >= item.from && range.from <= item.to : range.from < item.to && range.to > item.from);
}
