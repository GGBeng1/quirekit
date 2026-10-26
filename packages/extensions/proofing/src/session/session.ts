import { QUIRE_TRANSACTION_RENDER_IMPACT_META_KEY, type QuireEditor } from "@quirekit/core";
import type { Transaction } from "@quirekit/pm";
import type { ExtractedProofingBlock } from "../extract/types";
import { getProofingPluginState, proofingPluginKey } from "../plugin/state";
import type { ProofingBlockResult, ProofingMeta, ProofingSessionStatus } from "../plugin/types";
import type {
  ProofingCapabilities,
  ProofingController,
  ProofingExtensionOptions,
  ProofingIssue,
  ProofingProvider
} from "../types";
import { createProofingBatches } from "./batches";
import { collectDirtyBlocks, isProofingViewComposing } from "./collect";
import { ProofingSuggestions } from "./suggest";
import { ProofingResultCache } from "./cache";
import { ProofingDispatchGate } from "./gate";
import { ProofingTimer } from "./timer";
import { sendProofingRequest } from "./send";
import { ProofingUserWords } from "./words";

/**
 * Editor-local scheduler that turns dirty blocks into provider requests.
 *
 * It never edits the document: every outcome reaches the plugin as a
 * history-free meta transaction, so the plugin stays the single owner of
 * findings and the queue.
 */
export class ProofingSession implements ProofingController {
  private provider: ProofingProvider | null;
  private capabilities: ProofingCapabilities | null;
  private readonly timer: ProofingTimer;
  private readonly gate: ProofingDispatchGate;
  private failed = false;
  private destroyed = false;
  private requestCounter = 0;
  private readonly running = new Map<string, AbortController>();
  private readonly cache: ProofingResultCache;
  private readonly suggestions: ProofingSuggestions;
  private readonly words: ProofingUserWords;
  private readonly onTransaction = ({ transaction, appendedTransactions }: {
    readonly transaction: Transaction;
    readonly appendedTransactions: readonly Transaction[];
  }) => this.handleUpdate([transaction, ...appendedTransactions]);

  /**
   * @param editor - Owning editor.
   * @param options - Extension options.
   */
  constructor(private readonly editor: QuireEditor, private readonly options: ProofingExtensionOptions) {
    this.provider = options.provider;
    this.capabilities = options.provider?.getCapabilities?.() ?? null;
    this.timer = new ProofingTimer(options.maxWaitMs, () => this.run());
    this.gate = new ProofingDispatchGate(options.debounceMs, (metas) => {
      this.apply(metas);
      this.arm(0);
    });
    this.cache = new ProofingResultCache(options.defaultLanguage, options.maxSuggestions);
    this.suggestions = new ProofingSuggestions(options);
    this.words = new ProofingUserWords(options.dictionaryStore, (meta) => this.dispatch(meta));
    this.words.load(this.provider).catch((error: unknown) => this.report("provider-error", String(error), error));
    editor.on("transaction", this.onTransaction);
    this.arm(0);
  }

  /** @inheritdoc */
  suggest(issue: ProofingIssue, signal?: AbortSignal): Promise<readonly string[]> {
    return this.suggestions.suggest(this.provider, issue, signal);
  }

  /** @inheritdoc */
  setProvider(provider: ProofingProvider | null): void {
    this.abortAll();
    this.cache.clear();
    this.suggestions.clear();
    this.provider = provider;
    this.capabilities = provider?.getCapabilities?.() ?? null;
    this.failed = false;
    this.words.share(provider).catch((error: unknown) => this.report("provider-error", String(error), error));
    this.dispatch({ type: "recheck" });
    this.arm(0);
  }

  /**
   * Reacts to applied transactions: persists dictionary additions, aborts stale requests, and schedules checks.
   *
   * @param transactions - Transactions applied in this update.
   */
  handleUpdate(transactions: readonly Transaction[]): void {
    if (this.destroyed) return;
    let docChanged = false;
    for (const tr of transactions) {
      docChanged ||= tr.docChanged;
      // Batched updates come from the session itself; only single user commands need handling here.
      const raw: unknown = tr.getMeta(proofingPluginKey);
      if (raw === undefined || Array.isArray(raw)) continue;
      const meta = raw as ProofingMeta;
      if (meta.type === "add-word") {
        this.words.add(meta.word, this.provider).catch((error: unknown) => this.report("provider-error", String(error), error));
      }
      if (meta.type === "recheck") this.cache.clear();
    }
    const value = getProofingPluginState(this.editor.state.pm);
    if (value === undefined) return;
    if (!value.enabled) this.abortAll();
    for (const entry of value.inflight) {
      if (entry.stale) this.running.get(entry.requestId)?.abort();
    }
    if (docChanged) {
      this.gate.noteEdit();
      this.arm(this.options.debounceMs);
    }
    else if (!this.timer.armed && value.enabled && value.dirty.length > 0) this.arm(0);
    queueMicrotask(() => this.reportStatus());
  }

  /** Stops every timer and request. */
  destroy(): void {
    this.destroyed = true;
    this.editor.off("transaction", this.onTransaction);
    this.timer.clear();
    this.gate.clear();
    this.abortAll();
  }

  /**
   * Arms the check timer unless the session was destroyed.
   *
   * @param delay - Requested delay.
   */
  private arm(delay: number): void {
    if (!this.destroyed) this.timer.arm(delay);
  }

  /**
   * Collects dirty blocks and starts requests within the concurrency limit.
   *
   * Phase order: cached and skipped blocks resolve at once, the rest are
   * batched; one `schedule` meta records both before any request starts, so a
   * fast answer always finds its inflight entry.
   */
  private run(): void {
    const value = getProofingPluginState(this.editor.state.pm);
    const provider = this.provider;
    if (this.destroyed || value === undefined || !value.enabled || provider === null) return;
    if (isProofingViewComposing(this.editor)) {
      this.arm(this.options.debounceMs);
      return;
    }
    const capacity = this.options.maxConcurrentRequests - this.running.size;
    // Queued updates have not reached the plugin yet; scheduling now would collect the same blocks twice.
    if (capacity <= 0 || value.dirty.length === 0 || this.gate.pending) return;
    const supports = (language: string | null) => this.supports(language);
    const needsRequest = (block: ExtractedProofingBlock) => !this.cache.has(block)
      && block.segments.some((segment) => supports(segment.language));
    const { blocks, cleared } = collectDirtyBlocks(this.editor.state.pm, value, this.options.policy, {
      maxPending: capacity * this.options.maxSegmentsPerBatch,
      maxCharacters: capacity * this.options.maxCharactersPerBatch,
      maxScanned: 400
    }, needsRequest, this.options.resolveVisibleRange?.(this.editor) ?? null);
    const resolved: ProofingBlockResult[] = [];
    const pending: ExtractedProofingBlock[] = [];
    for (const block of blocks) {
      if (needsRequest(block)) pending.push(block);
      else resolved.push(this.cache.toResult(block));
    }
    const batches = createProofingBatches(pending, this.options, () => `request-${++this.requestCounter}`);
    this.dispatch({
      type: "schedule",
      cleared,
      pending: batches.flatMap(({ requestId, blocks: batch }) => batch.map((block) => ({ requestId, from: block.from, to: block.to }))),
      resolved
    });
    for (const batch of batches) void this.send(provider, batch.requestId, batch.blocks);
    if (blocks.length > 0 || cleared.length > 0) this.arm(0);
  }

  /**
   * Runs one request and reports its outcome to the plugin.
   *
   * @param provider - Provider at scheduling time.
   * @param requestId - Request identity.
   * @param blocks - Blocks of the request.
   */
  private async send(provider: ProofingProvider, requestId: string, blocks: readonly ExtractedProofingBlock[]): Promise<void> {
    const controller = new AbortController();
    this.running.set(requestId, controller);
    await sendProofingRequest(provider, blocks, controller, this.options, this.cache, {
      isCurrent: () => !this.destroyed && this.provider === provider,
      supports: (language) => this.supports(language),
      answered: (results) => {
        this.running.delete(requestId);
        this.failed = false;
        this.dispatch({ type: "results", requestId, blocks: results });
      },
      failed: (error) => {
        this.running.delete(requestId);
        if (error !== null) {
          this.failed = true;
          this.options.onError?.(error);
        }
        this.dispatch({ type: "release", requestId });
      }
    });
    this.arm(0);
  }

  /**
   * Tests whether the provider checks a segment language.
   *
   * @param language - Segment language, or null for the default.
   * @returns Whether to send the segment.
   */
  private supports(language: string | null): boolean {
    const resolved = language ?? this.options.defaultLanguage;
    const filter = this.capabilities?.supportsLanguage;
    return filter === undefined || (resolved !== null && filter(resolved));
  }

  /**
   * Publishes provider availability and failures when they change.
   *
   * "Checking" is derived by the plugin from its queue, so typing never needs
   * an extra status transaction.
   */
  private reportStatus(): void {
    const value = getProofingPluginState(this.editor.state.pm);
    if (this.destroyed || value === undefined) return;
    const status: ProofingSessionStatus = this.provider === null ? "disabled" : this.failed ? "degraded" : "idle";
    if (status !== value.sessionStatus) this.dispatch({ type: "status", status });
  }

  /**
   * Sends an error to the host callback.
   *
   * @param kind - Failure category.
   * @param message - Summary.
   * @param cause - Underlying error.
   */
  private report(kind: "provider-error" | "timeout" | "validation-error", message: string, cause?: unknown): void {
    this.options.onError?.({ kind, message, ...(cause === undefined ? {} : { cause }) });
  }

  /** Aborts every running request. */
  private abortAll(): void {
    for (const controller of this.running.values()) controller.abort();
  }

  /**
   * Queues a session update; it applies at once unless the user is editing.
   *
   * @param meta - Proofing metadata.
   */
  private dispatch(meta: ProofingMeta): void {
    if (!this.destroyed) this.gate.push(meta);
  }

  /**
   * Applies session updates in one history-free, presentation-only transaction.
   *
   * @param metas - Updates in order.
   */
  private apply(metas: readonly ProofingMeta[]): void {
    if (this.destroyed || this.editor.isDestroyed) return;
    // This complete chain contains only the session's presentation batch.
    this.editor.chain()
      .setMeta(proofingPluginKey, metas)
      .setMeta("addToHistory", false)
      .setMeta(QUIRE_TRANSACTION_RENDER_IMPACT_META_KEY, { kind: "presentation-only" })
      .run();
  }
}
