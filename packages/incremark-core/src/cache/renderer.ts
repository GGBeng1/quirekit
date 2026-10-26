import type { EditorState } from "@quirekit/cm-state";
import type { MarkdownLocale, MarkdownReadingError } from "../types";
import type { MarkdownAdapter, MarkdownRenderOptions } from "../reading/types";
import { projectMarkdown } from "../reading/render";
import { configuration, emptyWork, sameConfiguration } from "./configuration";
import { DependencyReader } from "./dependencies";
import type { CachedBlock, MarkdownCacheLimits, MarkdownRenderFrame, MarkdownRenderWork } from "./types";

/** Instance-owned bounded block cache; prepared output has no authority until committed. */
export class MarkdownRenderer<Output> {
  private blocks = new Map<number, CachedBlock<Output>>();
  private signature: readonly unknown[] = [];
  private counters = emptyWork();
  private version = 0;
  private readonly maxBlocks: number;
  private readonly maxSourceUnits: number;

  /** @param adapter - Output factory for this reading instance. @param limits - Non-negative retention budgets; zero disables retention. */
  constructor(private readonly adapter: MarkdownAdapter<Output>, limits: MarkdownCacheLimits = {}) {
    this.maxBlocks = limits.maxBlocks ?? 2048; this.maxSourceUnits = limits.maxSourceUnits ?? 2_000_000;
    for (const value of [this.maxBlocks, this.maxSourceUnits]) if (!Number.isSafeInteger(value) || value < 0) throw new RangeError("invalid-markdown-cache-limit");
  }

  /** @returns Detached work counters from the committed frame, including deferred helpers. */
  get work(): Readonly<MarkdownRenderWork> { return { ...this.counters }; }

  /** Releases retained output and invalidates every previously prepared frame. */
  clear(): void { this.version++; this.blocks = new Map(); this.signature = []; this.counters = emptyWork(); }

  /** @param state - Accepted source. @param locale - Control language. @param prefix - Instance namespace.
   * @param onError - Stable failure observer. @param options - Presentation policy.
   * @returns Prepared output; commit only after the framework accepts this render. */
  prepare(state: EditorState, locale: MarkdownLocale, prefix = "md-note", onError: (error: MarkdownReadingError) => void = console.error,
    options: MarkdownRenderOptions<Output> = {}): MarkdownRenderFrame<Output> {
    const work = emptyWork(), version = this.version;
    let next = new Map<number, CachedBlock<Output>>(), failures = 0, sealed = false, accepted = false, dependencies: DependencyReader<Output> | undefined;
    const errors: MarkdownReadingError[] = [];
    /** @param failure - Failure belonging to an accepted frame. */
    function notify(failure: MarkdownReadingError): void { try { onError(failure); } catch (error) { console.error(error); } }
    /** @param failure - Isolated failure; speculative rendering cannot call host observers. */
    function report(failure: MarkdownReadingError): void { failures++; if (accepted) notify(failure); else errors.push(failure); }
    const signature = [...configuration(state, locale, prefix, onError, options)];
    let enabled = options.cache !== false && this.maxBlocks > 0 && this.maxSourceUnits > 0;
    if (options.renderNode) {
      if (!options.renderNodeKey) enabled = false;
      else if (enabled) {
        try { signature.push(options.renderNodeKey(state)); }
        catch (cause) { enabled = false; report({ owner: "node-renderer", phase: "read", from: 0, to: state.doc.length, cause }); }
      }
    }
    let previous = sameConfiguration(this.signature, signature) ? this.blocks : new Map<number, CachedBlock<Output>>();
    // Build a current-document candidate directory without mutating the committed
    // forest. Abandoned concurrent renders cannot discard its output or counters.
    const output = projectMarkdown(this.adapter, state, locale, prefix, report, options, {
      projected: () => { work.projectedNodes++; },
      block: (context, node, project) => {
        if (sealed) return project();
        work.visitedBlocks++;
        const units = node.to - node.from, tree = node.tree;
        if (!enabled || !tree || next.size >= this.maxBlocks || work.cachedSourceUnits + units > this.maxSourceUnits) return this.adapter.block(node, project());
        dependencies ??= new DependencyReader(context, work);
        const existing = previous.get(node.from), errors = failures;
        let entry: CachedBlock<Output>;
        // Grammar identity proves local reuse; recorded semantic inputs separately
        // prove references, footnotes and trusted external dependencies remain equal.
        if (existing?.tree === tree && existing.to === node.to && dependencies.matches(existing.dependencies)) {
          entry = existing; work.reusedBlocks++;
        } else {
          const inputs = dependencies.collect(node), projected = this.adapter.block(node, project());
          if (!inputs.reusable || failures !== errors) return projected;
          entry = { tree, to: node.to, dependencies: inputs, output: projected };
        }
        next.set(node.from, entry); work.cachedBlocks++; work.cachedSourceUnits += units;
        return entry.output;
      },
    });
    // Deferred contribution helpers keep only source context, never a directory of
    // past blocks. Only the commit closure owns this prepared directory.
    sealed = true; let retained = next; next = new Map(); previous = new Map(); dependencies = undefined;
    return { output, get work() { return { ...work }; },
      /** @returns Whether this frame still owns the expected commit generation. */
      commit: () => {
        if (this.version !== version) { retained = new Map(); errors.length = 0; return false; }
        this.version++; this.blocks = retained; retained = new Map(); this.signature = signature; this.counters = work;
        accepted = true; for (const error of errors.splice(0)) notify(error);
        return true;
      },
    };
  }

  /** @param state - Accepted source. @param locale - Control language. @param prefix - Instance namespace.
   * @param onError - Failure observer. @param options - Presentation policy.
   * @returns Immediately committed output for synchronous rendering hosts. */
  render(state: EditorState, locale: MarkdownLocale, prefix = "md-note", onError: (error: MarkdownReadingError) => void = console.error,
    options: MarkdownRenderOptions<Output> = {}): Output {
    const frame = this.prepare(state, locale, prefix, onError, options); frame.commit(); return frame.output;
  }
}
