import { Parser, TreeFragment, type Input, type PartialParse, type Tree } from "@lezer/common";
import type { MarkdownParser } from "@quirekit/lezer-markdown";
import { retainReferences } from "../references/collect";
import { referenceInline } from "./inline";
import { affectedReferenceBlocks, certifyReferences, referenceBlocks } from "./chunks";
import { definitionSnapshot } from "./definitions";
import { orderedReferenceTrace } from "./dependencies";
import { retainSyntaxReuse } from "../../source/parsing/reuse";
import type { ReferenceBlock, ReferenceCertificates, ReferenceDefinitions, ReferenceParseWork, ReferenceTrace } from "./types";

const snapshots = new WeakMap<Tree, { definitions: ReferenceDefinitions | undefined; pending: boolean; work: ReferenceParseWork }>();

/** @param tree - Accepted tree. @returns Whether visible candidate syntax still needs a complete definition pass. */
export function referencesPending(tree: Tree): boolean { return snapshots.get(tree)?.pending ?? false; }
/** @param tree - Accepted tree. @returns Detached actual parse work without starting a parse. */
export function getReferenceParseWork(tree: Tree): ReferenceParseWork | undefined { const work = snapshots.get(tree)?.work; return work && { ...work }; }

/** Native multi-pass grammar that keeps reference decisions in the single accepted syntax tree. */
export class ReferenceMarkdownParser extends Parser {
  private readonly certificates: ReferenceCertificates = new WeakMap();
  /** @param base - All installed Markdown dialect and mixed-code configuration. */
  constructor(private readonly base: MarkdownParser) { super(); }

  /** @param input - Canonical source. @param fragments - Native reusable syntax. @param ranges - Native input islands. @returns Cooperative structural then reference-refinement parse. */
  createParse(input: Input, fragments: readonly TreeFragment[], ranges: readonly ReferenceBlock[]): PartialParse {
    const work: ReferenceParseWork = { visitedChunks: 0, reusedChunks: 0, checkedBlocks: 0, inlineChecks: 0, refinements: 0,
      definitionNodes: 0, definitionChunks: 0, definitionsRead: 0, copiedDefinitions: 0, definitionComparisons: 0, labelBuilds: 0, labelReads: 0,
      summaryLinks: 0, summaryComparisons: 0, reusedDefinitions: 0,
      dependencyReads: 0, dependencyChecks: 0, dependencyReuses: 0, certifiedChunks: 0, traceComparisons: 0,
      adoptedRanges: 0, composedRanges: 0 };
    const certificates = this.certificates, trace: ReferenceTrace = new Map();
    const previous = fragments.map(fragment => snapshots.get(fragment.tree)?.definitions).find(Boolean);
    let definitions: ReferenceDefinitions | undefined, labels: ReadonlySet<string> | undefined, stopped: number | null = null;
    const grammar = this.base.configure(referenceInline(this.base, () => labels, work, trace));
    let current = grammar.startParse(input, fragments, ranges);
    let structural: Tree | undefined;
    /** @param tree - Final native tree for this slice. @param pending - Whether all definitions are still unknown. @returns Tree with weak ownership metadata only. */
    function finish(tree: Tree, pending: boolean): Tree {
      if (labels) certifyReferences(tree, ranges[0]!.from, labels, certificates, orderedReferenceTrace(trace, work), work);
      trace.clear();
      if (definitions && !pending) retainReferences(tree, definitions.entries);
      Object.assign(work, retainSyntaxReuse(tree, structural, fragments));
      snapshots.set(tree, { definitions: definitions ?? previous, pending, work: { ...work } }); return tree;
    }
    return {
      // The first pass cannot publish full progress before definition-dependent grouping is resolved.
      get parsedPos() { return labels ? current.parsedPos : ranges[0]!.from; },
      get stoppedAt() { return stopped; },
      /** @param position - Earliest native slice boundary. */
      stopAt(position) { current.stopAt(position); stopped = position; },
      /** @returns One accepted grammar result, or another cooperative slice. */
      advance() {
        const tree = current.advance(); if (!tree) return null;
        if (labels) return finish(tree, stopped !== null && stopped < input.length);
        if (stopped !== null && stopped < input.length) return finish(tree, referenceBlocks(tree, ranges[0]!.from, input).length > 0);
        definitions = definitionSnapshot(tree, input, work, previous); labels = definitions.labels;
        const affected = affectedReferenceBlocks(tree, ranges[0]!.from, input, labels, work, certificates);
        if (!affected.length) return finish(tree, false);
        // Same-length invalidations retain coordinates and all unaffected native fragments. No source edit is emitted.
        const changes = affected.map(block => ({ fromA: block.from, toA: block.to, fromB: block.from, toB: block.to }));
        const reusable = TreeFragment.applyChanges(TreeFragment.addTree(tree), changes, 0);
        structural = tree;
        current = grammar.startParse(input, reusable, ranges); if (stopped !== null) current.stopAt(stopped);
        work.refinements++; return null;
      },
    };
  }
}
