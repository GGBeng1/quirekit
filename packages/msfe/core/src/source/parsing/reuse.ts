import type { ChangeDesc } from "@quirekit/cm-state";
import type { Tree, TreeFragment } from "@lezer/common";
import { MarkdownParser } from "@quirekit/lezer-markdown";
import type { NativeSyntaxReuse, SyntaxChangeWork, SyntaxReuseRange, SyntaxReuseWork } from "./types";

const composed = new WeakMap<Tree, WeakMap<Tree, readonly SyntaxReuseRange[]>>();

/** @param tree - Final native root. @returns Optional observation from the pinned parser patch, without requiring it in consumer installs. */
function nativeReuse(tree: Tree): NativeSyntaxReuse | undefined {
  return (MarkdownParser as typeof MarkdownParser & {
    getBlockReuse?: (root: Tree) => NativeSyntaxReuse | undefined;
  }).getBlockReuse?.(tree);
}

/** @param current - Accepted root. @param previous - Exact prior root. @returns Weakly owned adoption proof, never candidate fragments. */
function reuseRanges(current: Tree, previous: Tree): readonly SyntaxReuseRange[] | undefined {
  return composed.get(current)?.get(previous) ?? nativeReuse(current)?.get(previous);
}

/**
 * Connects only this parse's structural and refinement passes. Old roots remain weak
 * keys; there is no recursive proof lookup into previous document versions.
 * @param current - Final refined root. @param structural - First-pass root, or no refinement.
 * @param fragments - Inputs to the first pass. @returns Actual observation/composition work.
 */
export function retainSyntaxReuse(current: Tree, structural: Tree | undefined, fragments: readonly TreeFragment[]): SyntaxReuseWork {
  const final = nativeReuse(current), first = structural && nativeReuse(structural);
  const work = { adoptedRanges: (final?.count ?? 0) + (first?.count ?? 0), composedRanges: 0 };
  if (!structural || !first || !final) return work;
  const accepted = final.get(structural);
  if (!accepted) return work;
  const proofs = new WeakMap<Tree, readonly SyntaxReuseRange[]>();
  for (const origin of new Set(fragments.map(fragment => fragment.tree))) {
    const initial = first.get(origin);
    if (!initial) continue;
    const result: SyntaxReuseRange[] = [];
    let a = 0, b = 0;
    while (a < initial.length && b < accepted.length) {
      const before = initial[a]!, after = accepted[b]!; work.composedRanges++;
      const from = Math.max(before.from, after.from), to = Math.min(before.to, after.to);
      // Reference refinement invalidates syntax at unchanged source coordinates.
      // Unknown translations cannot inherit a first-pass proof.
      if (after.offset === 0 && from < to) result.push({ from, to, offset: before.offset });
      if (before.to <= after.to) a++; else b++;
    }
    if (result.length) proofs.set(origin, result);
  }
  composed.set(current, proofs);
  return work;
}

/**
 * Validates adopted ranges against unchanged source gaps, then queries them in
 * preorder. An enclosing semantic block is skipped only when fully certified.
 * @param previous - Exact prior root. @param current - New accepted root.
 * @param changes - Exact transaction mapping. @param work - Actual comparison work.
 * @returns Ordered whole-chunk predicate; unsupported parses use the existing diff.
 */
export function createSyntaxReuseMatcher(previous: Tree, current: Tree, changes: ChangeDesc,
  work: SyntaxChangeWork): (from: number, to: number) => boolean {
  const proof = reuseRanges(current, previous), valid: SyntaxReuseRange[] = [];
  let index = 0;
  if (proof) changes.iterGaps((oldFrom, from, length) => {
    const to = from + length;
    while (index < proof.length) {
      const range = proof[index]!; work.reuseMappings++;
      if (range.from >= to) break;
      if (range.to > from && range.offset === oldFrom - from)
        valid.push({ from: Math.max(range.from, from), to: Math.min(range.to, to), offset: range.offset });
      if (range.to > to) break;
      index++;
    }
  });
  index = 0;
  return (from, to) => {
    if (from === to) return false;
    while (index < valid.length) {
      const range = valid[index]!; work.reuseChecks++;
      if (range.to <= from) { index++; continue; }
      // A rebuilt parent may contain a new zero-length child exactly on an
      // adoption boundary. Keep both boundary paths on the identity fallback.
      return range.from < from && range.to > to;
    }
    return false;
  };
}
