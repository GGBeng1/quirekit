import type { QuireTextFragment, QuireTextMeasurer } from "@quirekit/layout/text";
import type { QuireBlockLayoutInput } from "../../engine/block-types";
import type {
  QuireInlineTextRun,
  QuireLineBreakMode
} from "@quirekit/layout/inline";
import type {
  CanvasBlockInputCacheEntry,
  QuireTextblockCapabilityRecord,
  QuireTextblockCapabilityRevalidator,
  QuireTextblockFlowRebinder
} from "./types";
import { appendCanvasTextblockInput, readCanvasTextblockInput } from "./textblock-input";
import { relocateQuireTextblockInput } from "./relocation/input";
import { rebaseCanvasBlockFragments } from "./fragment-rebase";
import type { QuireTextblockTailLineCheckpoints } from "./checkpoints";

/**
 * Per-build shaping configuration whose change invalidates every cached shape.
 *
 * Node identity and content width are the per-block cache key; everything else
 * that the shaping output depends on is folded into this build-level signature.
 * When the measurer instance or any of these fields change, the whole cache is
 * dropped so a stale shape is never served.
 */
export interface CanvasBlockShapeCacheConfig {
  /** Text measurer that produced (and must keep producing) the cached shapes. */
  readonly measurer: QuireTextMeasurer;
  /** Base CSS font shorthand used by unmarked text. */
  readonly font: string;
  /** Base visual line height feeding per-block metrics. */
  readonly lineHeight: number;
  /** Base vertical baseline offset feeding per-block metrics. */
  readonly textBaselineOffset: number;
  /** Inline line-breaking strategy used for wrapping. */
  readonly lineBreakMode: QuireLineBreakMode;
  /** Stable name of the active line-breaker policy, or undefined when none. */
  readonly lineBreakerName: string | undefined;
}

/** Observable counters for one block-shape cache instance. */
export interface CanvasBlockShapeCacheCounters {
  /** Number of shaped-fragment cache hits. */
  readonly fragmentHits: number;
  /** Number of shaped-fragment cache misses. */
  readonly fragmentMisses: number;
  /** Number of shaped-fragment cache stores. */
  readonly fragmentStores: number;
  /** Number of simple textblock input cache hits. */
  readonly inputHits: number;
  /** Number of simple textblock input cache misses. */
  readonly inputMisses: number;
  /** Number of simple textblock input cache stores. */
  readonly inputStores: number;
  /** Number of top-level input-list exact hits. */
  readonly topLevelInputExactHits: number;
  /** Number of top-level input-list shifted hits. */
  readonly topLevelInputShiftHits: number;
  /** Number of top-level input-list misses. */
  readonly topLevelInputMisses: number;
  /** Number of top-level inputs stored for the next collection pass. */
  readonly topLevelInputStores: number;
  /** Number of long textblock local-shape cache hits. */
  readonly localShapeHits: number;
  /** Number of long textblock local-shape cache misses. */
  readonly localShapeMisses: number;
  /** Number of long textblock local-shape cache stores. */
  readonly localShapeStores: number;
  /** Number of long textblock local-shape suffix reuse hits. */
  readonly localShapeSuffixHits: number;
  /** Number of long textblock local-shape converged suffix reuse hits. */
  readonly localShapeConvergedSuffixHits: number;
  /** Number of long textblock convergence probes that did not find a stable suffix. */
  readonly localShapeConvergenceMisses: number;
  /** Number of long textblock local-shape candidates that could not be reused. */
  readonly localShapeReuseMisses: number;
  /** Number of local-shape attempts bypassed during active IME preedit. */
  readonly localShapeBypassComposition?: number | undefined;
  /** Number of local-shape attempts bypassed because the textblock has multiple inline runs. */
  readonly localShapeBypassMultiRun?: number | undefined;
  /** Number of local-shape attempts bypassed because node-identity fragments already hit. */
  readonly localShapeBypassFragmentHit?: number | undefined;
  /** Number of local-shape attempts bypassed because a textblock input already hit. */
  readonly localShapeBypassTextblockInputHit?: number | undefined;
  /** Number of local-shape attempts bypassed because a top-level input already hit. */
  readonly localShapeBypassTopLevelInputHit?: number | undefined;
  /** Number of local-shape attempts bypassed by viewport-first estimated textblock inputs. */
  readonly localShapeBypassEstimated?: number | undefined;
}

/** Cached shaped result for one ProseMirror block at a given content width. */
interface CanvasBlockShapeCacheEntry {
  /** Content width the fragments were shaped against. */
  readonly width: number;
  /** Document position at the block content start when the fragments were shaped. */
  readonly contentStart: number;
  /** Geometry/dependency variant that produced the fragments. */
  readonly variant: string;
  /** Shaped text fragments produced for the block. */
  readonly fragments: readonly QuireTextFragment[];
  /** Block id embedded in the fragment ids, when the caller supplied it. */
  readonly id?: string | undefined;
}

/** Cached top-level block input list from the previous collection pass. */
interface CanvasTopLevelBlockInputListCacheEntry {
  /** Content width used to collect the inputs. */
  readonly width: number;
  /** Viewport-first shaping cap used for the collection pass. */
  readonly maxBlocks: number | undefined;
  /** Cumulative viewport-first shaping extent used for the collection pass. */
  readonly maxShapedBlockExtent: number | undefined;
  /** Measurement context shared by the collected top-level inputs. */
  readonly variant: string;
  /** Top-level block nodes in document order. */
  readonly nodes: readonly object[];
  /** Absolute document positions before each top-level block node. */
  readonly starts: readonly number[];
  /** Collected block inputs in document order. */
  readonly inputs: readonly QuireBlockLayoutInput[];
}

/** Cached last-known simple textblock shape used for local edit reuse. */
export interface CanvasTextblockTailShapeCacheEntry {
  /** Content width the fragments were shaped against. */
  readonly width: number;
  /** Stable block id embedded in fragment ids. */
  readonly id: string;
  /** Document position at the textblock content start. */
  readonly contentStart: number;
  /** Style and direction signature for the single retained inline run. */
  readonly runSignature: string;
  /** Full plain-text content of the retained single inline run. */
  readonly text: string;
  /** Shaped fragments retained for the textblock. */
  readonly fragments: readonly QuireTextFragment[];
  /** Retained line checkpoints for one-fragment-per-line local reuse. */
  readonly lineCheckpoints?: QuireTextblockTailLineCheckpoints | undefined;
  /** Whether the retained fragments were produced by native metric layout only. */
  readonly usesNativeMetricLayout?: boolean | undefined;
  /** Last successful bounded convergence probe size for repeated local edits. */
  readonly convergenceLookaheadLines?: number | undefined;
}

/** Reason a textblock skipped the local tail-shape reuse lane. */
export type CanvasTextblockTailShapeBypassReason =
  | "composition"
  | "fragment-hit"
  | "estimated"
  | "multi-run"
  | "textblock-input-hit"
  | "top-level-input-hit";

/**
 * Per-block text-shaping memo keyed by ProseMirror node identity plus content
 * width.
 *
 * ProseMirror nodes are immutable and reused (same object) for unchanged
 * subtrees across transactions, so a `WeakMap` keyed by the node gives correct,
 * automatic invalidation: a changed block is a new node object (cache miss);
 * an unchanged block is the same node object (cache hit). Width is part of the
 * key because line-breaking depends on content width, so a resize that changes
 * the wrap width must reshape. {@link prepare} additionally drops the whole
 * cache when the measurer instance or the build-level shaping config changes.
 */
export class CanvasBlockShapeCache {
  /** Shape variants keyed first by node identity, then geometry dependency. */
  private store = new WeakMap<object, Map<string, CanvasBlockShapeCacheEntry>>();

  /** Collected textblock inputs keyed by node identity, most recent first. */
  private inputStore = new WeakMap<object, readonly CanvasBlockInputCacheEntry[]>();

  /** Last simple textblock shapes keyed by stable id, width, and content start. */
  private textblockTailStore = new Map<string, CanvasTextblockTailShapeCacheEntry>();

  /** Retained tail-shape entry counts keyed before run-style signature lookup. */
  private textblockTailCandidateCounts = new Map<string, number>();

  /** Previous top-level block input list used for exact prefix reuse. */
  private topLevelInputStore: CanvasTopLevelBlockInputListCacheEntry | undefined;

  /** Maximum retained local-shape entries before dropping the oldest candidate. */
  private readonly maxTextblockTailEntries = 128;

  /** Measurer instance the current entries were shaped with. */
  private measurer: QuireTextMeasurer | undefined;

  /** Build-level shaping signature the current entries were shaped under. */
  private signature: string | undefined;

  /** Successful shaped-fragment cache reads. */
  private fragmentHits = 0;

  /** Failed shaped-fragment cache reads. */
  private fragmentMisses = 0;

  /** Shaped-fragment cache writes. */
  private fragmentStores = 0;

  /** Successful simple textblock input cache reads. */
  private inputHits = 0;

  /** Failed simple textblock input cache reads. */
  private inputMisses = 0;

  /** Simple textblock input cache writes. */
  private inputStores = 0;

  /** Successful exact top-level input-list reads. */
  private topLevelInputExactHits = 0;

  /** Successful shifted top-level input-list reads. */
  private topLevelInputShiftHits = 0;

  /** Failed top-level input-list reads. */
  private topLevelInputMisses = 0;

  /** Top-level inputs stored for future collection passes. */
  private topLevelInputStores = 0;

  /** Successful long textblock local-shape cache reads. */
  private localShapeHits = 0;

  /** Failed long textblock local-shape cache reads. */
  private localShapeMisses = 0;

  /** Long textblock local-shape cache writes. */
  private localShapeStores = 0;

  /** Successful long textblock suffix reuse attempts. */
  private localShapeSuffixHits = 0;

  /** Successful long textblock converged suffix reuse attempts. */
  private localShapeConvergedSuffixHits = 0;

  /** Failed long textblock convergence probes. */
  private localShapeConvergenceMisses = 0;

  /** Failed long textblock reuse attempts after a candidate was found. */
  private localShapeReuseMisses = 0;

  /** Local-shape attempts bypassed during active IME preedit. */
  private localShapeBypassComposition = 0;

  /** Local-shape attempts bypassed because a textblock has multiple inline runs. */
  private localShapeBypassMultiRun = 0;

  /** Local-shape attempts bypassed because the node-identity cache already hit. */
  private localShapeBypassFragmentHit = 0;

  /** Local-shape attempts bypassed because a textblock input cache already hit. */
  private localShapeBypassTextblockInputHit = 0;

  /** Local-shape attempts bypassed because a top-level input cache already hit. */
  private localShapeBypassTopLevelInputHit = 0;

  /** Local-shape attempts bypassed by viewport-first estimated textblock inputs. */
  private localShapeBypassEstimated = 0;

  /**
   * Prepares the cache for a build, dropping all entries when the measurer
   * instance or the build-level shaping config has changed since the last build.
   *
   * @param config - Build-level shaping configuration for the upcoming pass.
   * @returns Nothing.
   */
  prepare(config: CanvasBlockShapeCacheConfig): void {
    const signature = [
      config.measurer.version ?? "",
      config.font,
      config.lineHeight,
      config.textBaselineOffset,
      config.lineBreakMode,
      config.lineBreakerName ?? ""
    ].join("\\u0000");

    if (this.measurer !== config.measurer || this.signature !== signature) {
      this.store = new WeakMap();
      this.inputStore = new WeakMap();
      this.textblockTailStore = new Map();
      this.textblockTailCandidateCounts = new Map();
      this.topLevelInputStore = undefined;
      this.measurer = config.measurer;
      this.signature = signature;
      this.resetCounters();
    }
  }

  /**
   * Reads cached shaped fragments for a node at a content width, rebasing them
   * when the block has shifted position or changed its path-based id.
   *
   * Shaping is position- and id-independent, but the cached fragments carry
   * absolute document positions and ids prefixed by the block id; serving them
   * stale maps hit-testing, selection and owned decorations to the wrong block.
   *
   * @param node - ProseMirror block node used as the cache key.
   * @param width - Content width the fragments must have been shaped against.
   * @param contentStart - Current document position at the block content start.
   * @param variant - Geometry/dependency signature for the requested shape.
   * @param id - Current block id embedded in fragment ids.
   * @returns Cached fragments at the current position and id, or undefined on a miss.
   */
  get(
    node: object,
    width: number,
    contentStart: number,
    variant = "default",
    id?: string
  ): readonly QuireTextFragment[] | undefined {
    const entries = this.store.get(node);
    const entry = entries?.get(createBlockShapeVariantKey(width, variant));
    const fragments = entry === undefined || entry.width !== width || entry.variant !== variant
      || !Number.isFinite(entry.contentStart)
      ? undefined
      : rebaseCanvasBlockFragments(entry.fragments, contentStart - entry.contentStart, entry.id, id);
    if (fragments === undefined) {
      this.fragmentMisses += 1;
      return undefined;
    }
    if (fragments !== entry!.fragments) {
      entries?.set(createBlockShapeVariantKey(width, variant), { width, contentStart, variant, fragments, id: id ?? entry!.id });
    }
    this.fragmentHits += 1;
    return fragments;
  }

  /**
   * Stores shaped fragments for a node at a content width and position.
   *
   * @param node - ProseMirror block node used as the cache key.
   * @param width - Content width the fragments were shaped against.
   * @param contentStart - Document position at the block content start.
   * @param fragments - Shaped text fragments to cache.
   * @param variant - Geometry/dependency signature for the stored shape.
   * @param id - Block id embedded in the fragment ids.
   */
  set(
    node: object,
    width: number,
    contentStart: number,
    fragments: readonly QuireTextFragment[],
    variant = "default",
    id?: string
  ): void {
    const entries = this.store.get(node) ?? new Map();
    const key = createBlockShapeVariantKey(width, variant);

    // A textblock normally owns one fixed-width shape or one baseline plus one
    // flow-slot result. The small cap prevents viewport resize churn from
    // retaining an unbounded set of widths for a long-lived node identity.
    if (!entries.has(key) && entries.size >= 4) {
      const oldest = entries.keys().next().value;
      if (typeof oldest === "string") {
        entries.delete(oldest);
      }
    }
    entries.set(key, { width, contentStart, variant, fragments, id });
    this.store.set(node, entries);
    this.fragmentStores += 1;
  }

  /**
   * Reads a cached local block input for an unchanged simple textblock.
   *
   * The block input embeds stable ids, absolute ranges, and caret positions. When
   * the same retained ProseMirror textblock shifts because an edit happened above
   * it, the input can be remapped by the content-start delta: geometry and text
   * shaping stay unchanged, while document ranges and caret stops move together.
   *
   * @param node - ProseMirror textblock node used as the cache key.
   * @param width - Content width the input must have been collected against.
   * @param id - Stable block input id for the current document path.
   * @param contentStart - Current document position at the block content start.
   * @param variant - Geometry/dependency signature for the requested input.
   * @param rebindTextFlowReflow - Current collector authority used only when source positions move.
   * @param revalidateCapabilities - Current collector's capability revalidation; capability inputs miss without it.
   * @returns Cached block input, or undefined on a miss.
   */
  getTextblockInput(
    node: object,
    width: number,
    id: string,
    contentStart: number,
    variant = "default",
    rebindTextFlowReflow?: QuireTextblockFlowRebinder,
    revalidateCapabilities?: QuireTextblockCapabilityRevalidator
  ): QuireBlockLayoutInput | undefined {
    const input = readCanvasTextblockInput(this.inputStore.get(node) ?? [], { width, id, contentStart, variant },
      rebindTextFlowReflow, revalidateCapabilities);
    if (input === undefined) this.inputMisses += 1;
    else this.inputHits += 1;
    return input;
  }

  /**
   * Stores a local block input for an unchanged simple textblock.
   *
   * @param node - ProseMirror textblock node used as the cache key.
   * @param width - Content width the input was collected against.
   * @param id - Stable block input id embedded in the input.
   * @param contentStart - Document position at the block content start.
   * @param input - Collected local block input to cache.
   * @param variant - Geometry/dependency signature for the stored input.
   * @param capabilities - Recorded capability resolutions that make a capability-bearing input reusable.
   * @returns Nothing.
   */
  setTextblockInput(
    node: object,
    width: number,
    id: string,
    contentStart: number,
    input: QuireBlockLayoutInput,
    variant = "default",
    capabilities?: QuireTextblockCapabilityRecord
  ): void {
    this.inputStore.set(node, appendCanvasTextblockInput(this.inputStore.get(node),
      { width, id, contentStart, variant, input, capabilities }));
    this.inputStores += 1;
  }

  /**
   * Reads a reusable top-level block input from the previous collection pass.
   *
   * This remains narrower than retained block records: it only reuses the input
   * when the same top-level ProseMirror node appears at the same block index
   * under the same collection width and viewport-first cap. Exact starts reuse
   * the previous input directly; shifted starts are allowed only for simple
   * textblock or estimated leaf inputs whose absolute document positions can be
   * remapped without reopening custom structure. Provider inputs are bound to
   * one snapshot authority and therefore always miss this cross-snapshot cache.
   *
   * @param node - Current top-level ProseMirror block node.
   * @param blockIndex - Block index among collected top-level blocks.
   * @param start - Absolute document position before the block node.
   * @param width - Content width used by the current collection pass.
   * @param maxBlocks - Viewport-first shaping cap for the current pass.
   * @param maxShapedBlockExtent - Viewport-first cumulative height cap.
   * @param variant - Measurement context shared by the collection pass.
   * @param rebindTextFlowReflow - Current collector authority used only when source positions move.
   * @returns Cached block input, or undefined when exact reuse is unsafe.
   */
  getTopLevelBlockInput(
    node: object,
    blockIndex: number,
    start: number,
    width: number,
    maxBlocks: number | undefined,
    maxShapedBlockExtent: number | undefined,
    variant = "default",
    rebindTextFlowReflow?: QuireTextblockFlowRebinder
  ): QuireBlockLayoutInput | undefined {
    const entry = this.topLevelInputStore;

    if (
      entry === undefined ||
      entry.width !== width ||
      entry.maxBlocks !== maxBlocks ||
      entry.maxShapedBlockExtent !== maxShapedBlockExtent ||
      entry.variant !== variant ||
      entry.nodes[blockIndex] !== node
    ) {
      this.topLevelInputMisses += 1;
      return undefined;
    }

    const previousStart = entry.starts[blockIndex];
    const input = entry.inputs[blockIndex];

    if (previousStart === undefined || input === undefined) {
      this.topLevelInputMisses += 1;
      return undefined;
    }

    if (hasSnapshotBoundLayoutProduct(input)) {
      this.topLevelInputMisses += 1;
      return undefined;
    }

    if (previousStart === start) {
      this.topLevelInputExactHits += 1;
      return input;
    }

    const shifted = remapCanvasTopLevelBlockInput(input, start - previousStart, rebindTextFlowReflow);
    if (shifted === undefined) {
      this.topLevelInputMisses += 1;
      return undefined;
    }

    this.topLevelInputShiftHits += 1;

    return shifted;
  }

  /**
   * Stores the collected top-level block input list for the next pass.
   *
   * @param width - Content width used by the collection pass.
   * @param maxBlocks - Viewport-first shaping cap used by the pass.
   * @param maxShapedBlockExtent - Viewport-first cumulative height cap.
   * @param nodes - Top-level block nodes in document order.
   * @param starts - Absolute document positions before each block node.
   * @param inputs - Collected block inputs in document order.
   * @param variant - Measurement context shared by the collection pass.
   * @returns Nothing.
   */
  setTopLevelBlockInputs(
    width: number,
    maxBlocks: number | undefined,
    maxShapedBlockExtent: number | undefined,
    nodes: readonly object[],
    starts: readonly number[],
    inputs: readonly QuireBlockLayoutInput[],
    variant = "default"
  ): void {
    this.topLevelInputStore = {
      width,
      maxBlocks,
      maxShapedBlockExtent,
      variant,
      nodes,
      starts,
      inputs
    };
    this.topLevelInputStores += inputs.length;
  }

  /**
   * Checks whether any retained local shape exists for a textblock candidate.
   *
   * This intentionally ignores the run-style signature. Off-window dirty blocks
   * use it as a cheap guard before collecting huge inline runs; the precise
   * `getTextblockTailShape` call still verifies style, direction, and text.
   *
   * @param id - Stable block id embedded in fragment ids.
   * @param width - Content width the retained shape must have used.
   * @param contentStart - Current document position at the textblock content start.
   * @returns Whether a retained candidate exists for this block geometry.
   */
  hasTextblockTailShapeCandidate(
    id: string,
    width: number,
    contentStart: number
  ): boolean {
    return (
      (this.textblockTailCandidateCounts.get(
        createTextblockTailShapeCandidateKey(id, width, contentStart)
      ) ?? 0) > 0
    );
  }

  /**
   * Reads the previous simple textblock shape for a local-edit candidate.
   *
   * Unlike the node-identity `WeakMap`, this small strong map intentionally
   * survives one textblock node replacement. It lets one local insert/delete
   * compare the new single run against the last shaped text for the same stable block
   * position and style.
   *
   * @param id - Stable block id embedded in fragment ids.
   * @param width - Content width the retained shape must have used.
   * @param contentStart - Current document position at the textblock content start.
   * @param runSignature - Style and direction signature for the current single run.
   * @returns Retained shape entry, or undefined on a miss.
   */
  getTextblockTailShape(
    id: string,
    width: number,
    contentStart: number,
    runSignature: string
  ): CanvasTextblockTailShapeCacheEntry | undefined {
    const entry = this.textblockTailStore.get(
      createTextblockTailShapeKey(id, width, contentStart, runSignature)
    );

    if (
      entry === undefined ||
      entry.width !== width ||
      entry.id !== id ||
      entry.contentStart !== contentStart ||
      entry.runSignature !== runSignature
    ) {
      this.localShapeMisses += 1;
      return undefined;
    }

    this.localShapeHits += 1;
    return entry;
  }

  /**
   * Stores the last simple textblock shape for future local edit reuse.
   *
   * @param entry - Retained simple textblock shape.
   * @returns Nothing.
   */
  setTextblockTailShape(entry: CanvasTextblockTailShapeCacheEntry): void {
    const key = createTextblockTailShapeKey(
      entry.id,
      entry.width,
      entry.contentStart,
      entry.runSignature
    );

    if (
      !this.textblockTailStore.has(key) &&
      this.textblockTailStore.size >= this.maxTextblockTailEntries
    ) {
      const firstKey = this.textblockTailStore.keys().next().value;
      if (typeof firstKey === "string") {
        const removed = this.textblockTailStore.get(firstKey);
        this.textblockTailStore.delete(firstKey);
        if (removed !== undefined) {
          this.decrementTextblockTailShapeCandidate(removed);
        }
      }
    }

    if (!this.textblockTailStore.has(key)) {
      this.incrementTextblockTailShapeCandidate(entry);
    }
    this.textblockTailStore.set(key, entry);
    this.localShapeStores += 1;
  }

  /**
   * Increments the coarse candidate count for a retained textblock tail shape.
   *
   * @param entry - Retained tail-shape entry being inserted.
   * @returns Nothing.
   */
  private incrementTextblockTailShapeCandidate(
    entry: CanvasTextblockTailShapeCacheEntry
  ): void {
    const key = createTextblockTailShapeCandidateKey(
      entry.id,
      entry.width,
      entry.contentStart
    );
    this.textblockTailCandidateCounts.set(
      key,
      (this.textblockTailCandidateCounts.get(key) ?? 0) + 1
    );
  }

  /**
   * Decrements the coarse candidate count for an evicted textblock tail shape.
   *
   * @param entry - Retained tail-shape entry being removed.
   * @returns Nothing.
   */
  private decrementTextblockTailShapeCandidate(
    entry: CanvasTextblockTailShapeCacheEntry
  ): void {
    const key = createTextblockTailShapeCandidateKey(
      entry.id,
      entry.width,
      entry.contentStart
    );
    const next = (this.textblockTailCandidateCounts.get(key) ?? 0) - 1;
    if (next <= 0) {
      this.textblockTailCandidateCounts.delete(key);
      return;
    }

    this.textblockTailCandidateCounts.set(key, next);
  }

  /**
   * Records the result of a textblock local-shape reuse attempt.
   *
   * @param outcome - Tail reuse outcome emitted by the ProseMirror textblock shaper.
   * @returns Nothing.
   */
  recordTextblockTailReuseOutcome(
    outcome:
      | "suffix-hit"
      | "converged-suffix-hit"
      | "convergence-miss"
      | "miss"
  ): void {
    switch (outcome) {
      case "suffix-hit":
        this.localShapeSuffixHits += 1;
        break;
      case "converged-suffix-hit":
        this.localShapeConvergedSuffixHits += 1;
        break;
      case "convergence-miss":
        this.localShapeConvergenceMisses += 1;
        break;
      case "miss":
        this.localShapeReuseMisses += 1;
        break;
    }
  }

  /**
   * Records why a textblock did not enter the local tail-shape cache lane.
   *
   * @param reason - Bypass reason observed by the ProseMirror textblock shaper.
   * @param count - Number of identical bypass events to record.
   * @returns Nothing.
   */
  recordTextblockTailBypass(
    reason: CanvasTextblockTailShapeBypassReason,
    count = 1
  ): void {
    switch (reason) {
      case "composition":
        this.localShapeBypassComposition += count;
        break;
      case "fragment-hit":
        this.localShapeBypassFragmentHit += count;
        break;
      case "estimated":
        this.localShapeBypassEstimated += count;
        break;
      case "multi-run":
        this.localShapeBypassMultiRun += count;
        break;
      case "textblock-input-hit":
        this.localShapeBypassTextblockInputHit += count;
        break;
      case "top-level-input-hit":
        this.localShapeBypassTopLevelInputHit += count;
        break;
    }
  }

  /**
   * Returns observable cache counters for diagnostics and performance reports.
   *
   * @returns Cache hit, miss, and store counters grouped by shape-cache layer.
   */
  snapshot(): CanvasBlockShapeCacheCounters {
    return {
      fragmentHits: this.fragmentHits,
      fragmentMisses: this.fragmentMisses,
      fragmentStores: this.fragmentStores,
      inputHits: this.inputHits,
      inputMisses: this.inputMisses,
      inputStores: this.inputStores,
      topLevelInputExactHits: this.topLevelInputExactHits,
      topLevelInputShiftHits: this.topLevelInputShiftHits,
      topLevelInputMisses: this.topLevelInputMisses,
      topLevelInputStores: this.topLevelInputStores,
      localShapeHits: this.localShapeHits,
      localShapeMisses: this.localShapeMisses,
      localShapeStores: this.localShapeStores,
      localShapeSuffixHits: this.localShapeSuffixHits,
      localShapeConvergedSuffixHits: this.localShapeConvergedSuffixHits,
      localShapeConvergenceMisses: this.localShapeConvergenceMisses,
      localShapeReuseMisses: this.localShapeReuseMisses,
      localShapeBypassComposition: this.localShapeBypassComposition,
      localShapeBypassMultiRun: this.localShapeBypassMultiRun,
      localShapeBypassFragmentHit: this.localShapeBypassFragmentHit,
      localShapeBypassTextblockInputHit: this.localShapeBypassTextblockInputHit,
      localShapeBypassTopLevelInputHit: this.localShapeBypassTopLevelInputHit,
      localShapeBypassEstimated: this.localShapeBypassEstimated
    };
  }

  /**
   * Drops every cached shape.
   *
   * @returns Nothing.
   */
  clear(): void {
    this.store = new WeakMap();
    this.inputStore = new WeakMap();
    this.textblockTailStore = new Map();
    this.textblockTailCandidateCounts = new Map();
    this.topLevelInputStore = undefined;
    this.measurer = undefined;
    this.signature = undefined;
    this.resetCounters();
  }

  /**
   * Resets observable counters after a full cache invalidation.
   *
   * @returns Nothing.
   */
  private resetCounters(): void {
    this.fragmentHits = 0;
    this.fragmentMisses = 0;
    this.fragmentStores = 0;
    this.inputHits = 0;
    this.inputMisses = 0;
    this.inputStores = 0;
    this.topLevelInputExactHits = 0;
    this.topLevelInputShiftHits = 0;
    this.topLevelInputMisses = 0;
    this.topLevelInputStores = 0;
    this.localShapeHits = 0;
    this.localShapeMisses = 0;
    this.localShapeStores = 0;
    this.localShapeSuffixHits = 0;
    this.localShapeConvergedSuffixHits = 0;
    this.localShapeConvergenceMisses = 0;
    this.localShapeReuseMisses = 0;
    this.localShapeBypassComposition = 0;
    this.localShapeBypassMultiRun = 0;
    this.localShapeBypassFragmentHit = 0;
    this.localShapeBypassTextblockInputHit = 0;
    this.localShapeBypassTopLevelInputHit = 0;
    this.localShapeBypassEstimated = 0;
  }
}

/**
 * Creates the strong-map key for a retained textblock local-shape candidate.
 *
 * @param id - Stable block id embedded in fragment ids.
 * @param width - Content width the retained shape was built against.
 * @param contentStart - Document position at the textblock content start.
 * @param runSignature - Style and direction signature for the retained run.
 * @returns Stable map key for the retained local-shape entry.
 */
function createTextblockTailShapeKey(
  id: string,
  width: number,
  contentStart: number,
  runSignature: string
): string {
  return JSON.stringify([id, width, contentStart, runSignature]);
}

/**
 * Creates the per-node key for one shaped geometry/dependency variant.
 *
 * @param width - Content width used for line breaking.
 * @param variant - Stable dependency signature for the shaped geometry.
 * @returns Stable variant key inside one node-identity bucket.
 */
function createBlockShapeVariantKey(width: number, variant: string): string {
  return JSON.stringify([width, variant]);
}

/**
 * Creates the coarse key used to check for any retained tail-shape candidate.
 *
 * @param id - Stable block id embedded in fragment ids.
 * @param width - Content width the retained shape was built against.
 * @param contentStart - Document position at the textblock content start.
 * @returns Stable candidate key before style/direction signature matching.
 */
function createTextblockTailShapeCandidateKey(
  id: string,
  width: number,
  contentStart: number
): string {
  return JSON.stringify([id, width, contentStart]);
}

/**
 * Shifts a reusable top-level block input when only its document position moved.
 *
 * @param input - Cached top-level input from the previous collection pass.
 * @param delta - Document offset to add.
 * @param rebind - Current collector authority for moved native services.
 * @returns Shifted input, or undefined when the input owns structure that must be rebuilt.
 */
function remapCanvasTopLevelBlockInput(
  input: QuireBlockLayoutInput,
  delta: number,
  rebind?: QuireTextblockFlowRebinder
): QuireBlockLayoutInput | undefined {
  if (!isShiftableCanvasTopLevelBlockInput(input)) {
    return undefined;
  }

  return relocateQuireTextblockInput(input, delta, rebind);
}

/**
 * Checks whether a top-level input can be shifted without rebuilding structure.
 *
 * @param input - Candidate top-level input.
 * @returns Whether the input is a simple textblock or estimated leaf.
 */
function isShiftableCanvasTopLevelBlockInput(
  input: QuireBlockLayoutInput
): boolean {
  return (
    input.children === undefined &&
    input.layoutProvider === undefined &&
    (Object.prototype.hasOwnProperty.call(input, "textFragments") ||
      input.estimated === true)
  );
}

/**
 * Checks whether an input tree retains a layout product from one snapshot.
 *
 * Structural containers such as Word sections can own provider-backed blocks
 * several levels below the cache entry. Reusing the container would otherwise
 * replay those descendants against a newer provider lifecycle epoch.
 *
 * @param input - Candidate cached block-input tree.
 * @returns Whether this input or any descendant is snapshot-bound.
 */
function hasSnapshotBoundLayoutProduct(
  input: QuireBlockLayoutInput
): boolean {
  return hasSnapshotBoundInlineSourceCapability(input)
    || input.layoutProvider !== undefined
    || (input.children?.some(hasSnapshotBoundLayoutProduct) ?? false);
}

/**
 * Reports whether an input owns inline capability sidecars compiled this pass.
 *
 * Capability products can depend on auxiliary-story ranges and extension
 * state outside the immutable paragraph node. Reusing the complete input would
 * bypass that compilation and hide a changed flow-exclusion dependency.
 *
 * @param input - Candidate cached block input.
 * @returns Whether the input must be recollected for the current snapshot.
 */
function hasSnapshotBoundInlineSourceCapability(
  input: QuireBlockLayoutInput
): boolean {
  return (input.sourceCapabilities?.length ?? 0) > 0;
}

/**
 * Creates an empty per-block text-shaping cache.
 *
 * @returns A new {@link CanvasBlockShapeCache}.
 */
export function createQuireBlockShapeCache(): CanvasBlockShapeCache {
  return new CanvasBlockShapeCache();
}
