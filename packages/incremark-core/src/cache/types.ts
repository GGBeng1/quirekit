import type { Tree } from "@lezer/common";
import type { ReadingContribution } from "../contributions/types";

/** A speculative projection accepted only by an explicit framework commit. */
export interface MarkdownRenderFrame<Output> {
  /** Disposable output for this render attempt. */ readonly output: Output;
  /** Current attempt's detached work counters. */ readonly work: Readonly<MarkdownRenderWork>;
  /** @returns True once if no newer commit or clear invalidated the attempt. */ commit(): boolean;
}

/** Per-reader retention limits; exceeding a limit falls back to ordinary projection. */
export interface MarkdownCacheLimits {
  /** Maximum retained top-level blocks; defaults to 2048. Zero disables retention. */ readonly maxBlocks?: number;
  /** Maximum sum of cached source spans in UTF-16 units; defaults to 2,000,000. This is not a heap-byte bound. */ readonly maxSourceUnits?: number;
}

/** Actual work in the most recent projection; excludes parsing, DOM diff and painting. */
export interface MarkdownRenderWork {
  /** Top-level candidates reached by the reader. */ visitedBlocks: number;
  /** Candidates whose previous framework output was reused. */ reusedBlocks: number;
  /** Node dispatches actually projected, including deferred custom child helpers. */ projectedNodes: number;
  /** Syntax nodes visited to establish new dependency summaries. */ dependencyNodes: number;
  /** Recorded reference, footnote and custom-key values checked on cache hits. */ semanticChecks: number;
  /** Blocks retained after the current projection. */ cachedBlocks: number;
  /** Sum of retained block spans in UTF-16 units. */ cachedSourceUnits: number;
}

/** Semantic inputs independent of the immutable local syntax. */
export interface BlockDependencies<Output> {
  /** False when a custom reader or HTML policy has no reuse proof. */ reusable: boolean;
  /** Raw reference label to resolved status, URL and title. */ readonly references: Map<string, string>;
  /** Normalized footnote label to numbering/navigation inputs. */ readonly footnotes: Map<string, string>;
  /** Absolute inline-footnote position to numbering inputs. */ readonly inline: Map<number, string>;
  /** Declared external contribution dependencies, compared with Object.is. */ readonly keys: Map<ReadingContribution<Output>, unknown>;
}

/** A single current, unmoved top-level block; never shared between reading instances. */
export interface CachedBlock<Output> {
  /** Native immutable syntax identity, not a source hash or offset-derived id. */ readonly tree: Tree;
  /** Exclusive accepted source end; start is the directory lookup key. */ readonly to: number;
  /** Semantic dependency certificate for this block. */ readonly dependencies: BlockDependencies<Output>;
  /** Already-projected output, used once at its current document position. */ readonly output: Output;
}

/** A custom dependency declaration may be absent or fail without aborting rendering. */
export interface DependencyKey {
  /** Whether reuse has a complete declared contract. */ readonly reusable: boolean;
  /** Consumer identity, including undefined when intentionally returned. */ readonly value: unknown;
}
