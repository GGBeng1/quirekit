import {
  defaultSlowThresholds,
  normalizeEntryLimit,
  readDefaultClock
} from "./config";
import {
  createInteractionEntry,
  createOperationEntry,
  createRenderEntry
} from "./entries";
import {
  createInteractionToken,
  createOperationToken
} from "./tokens";
import type {
  QuireDevtoolsClock,
  QuireDevtoolsEntry,
  QuireDevtoolsInteractionEntry,
  QuireDevtoolsInteractionFinishInput,
  QuireDevtoolsInteractionInput,
  QuireDevtoolsInteractionToken,
  QuireDevtoolsOperationEntry,
  QuireDevtoolsOperationFinishInput,
  QuireDevtoolsOperationInput,
  QuireDevtoolsOperationToken,
  QuireDevtoolsOptions,
  QuireDevtoolsRecorder,
  QuireDevtoolsRenderEntry,
  QuireDevtoolsRenderSummary,
  QuireDevtoolsSubscriber,
  QuireDevtoolsSubscription
} from "../types";

/** In-memory recorder implementation shared by devtools adapters. */
export class QuireDevtoolsMemoryRecorder implements QuireDevtoolsRecorder {
  private readonly enabled: boolean;
  private readonly maxEntries: number;
  /** Per-entry-type slow thresholds; a configured `slowThresholdMs` overrides all. */
  private readonly operationThresholdMs: number;
  private readonly renderThresholdMs: number;
  private readonly interactionThresholdMs: number;
  private readonly clock: QuireDevtoolsClock;
  private readonly entries: QuireDevtoolsEntry[] = [];
  private readonly subscribers = new Set<QuireDevtoolsSubscriber>();
  private nextId = 1;

  /**
   * Creates an in-memory recorder.
   *
   * @param options - Recorder options.
   */
  constructor(options: QuireDevtoolsOptions = {}) {
    this.enabled = options.enabled ?? true;
    this.maxEntries = normalizeEntryLimit(options.maxEntries);
    const override = options.slowThresholdMs;
    this.operationThresholdMs = override ?? defaultSlowThresholds.operation;
    this.renderThresholdMs = override ?? defaultSlowThresholds.render;
    this.interactionThresholdMs = override ?? defaultSlowThresholds.interaction;
    this.clock = options.clock ?? readDefaultClock;
  }

  /**
   * Starts timing an editor operation.
   *
   * @param input - Operation metadata to attach to the final entry.
   * @returns Opaque token to pass to `finishOperation`.
   */
  startOperation(input: QuireDevtoolsOperationInput = {}): QuireDevtoolsOperationToken {
    return createOperationToken(input, this.clock);
  }

  /**
   * Finishes timing an editor operation and stores the entry.
   *
   * @param token - Operation token returned by `startOperation`.
   * @returns Recorded entry, or undefined when the recorder is disabled.
   */
  finishOperation(
    token: QuireDevtoolsOperationToken,
    input: QuireDevtoolsOperationFinishInput = {}
  ): QuireDevtoolsOperationEntry | undefined {
    return this.store(
      createOperationEntry(this.nextId, token, input, this.clock(), this.operationThresholdMs)
    );
  }

  /**
   * Records a mounted view render summary.
   *
   * @param summary - Render metrics extracted from a mounted render event.
   * @returns Recorded entry, or undefined when the recorder is disabled.
   */
  recordRender(
    summary: QuireDevtoolsRenderSummary
  ): QuireDevtoolsRenderEntry | undefined {
    return this.store(
      createRenderEntry(this.nextId, summary, this.clock(), this.renderThresholdMs)
    );
  }

  /**
   * Starts timing a browser interaction-to-render trace.
   *
   * @param input - Interaction metadata to attach to the final entry.
   * @returns Opaque token to pass to `finishInteraction`.
   */
  startInteraction(
    input: QuireDevtoolsInteractionInput
  ): QuireDevtoolsInteractionToken {
    return createInteractionToken(input, this.clock);
  }

  /**
   * Finishes timing a browser interaction-to-render trace.
   *
   * @param token - Interaction token returned by `startInteraction`.
   * @param input - Trace completion metadata.
   * @returns Recorded entry, or undefined when the recorder is disabled.
   */
  finishInteraction(
    token: QuireDevtoolsInteractionToken,
    input: QuireDevtoolsInteractionFinishInput
  ): QuireDevtoolsInteractionEntry | undefined {
    return this.store(
      createInteractionEntry(this.nextId, token, input, this.clock(), this.interactionThresholdMs)
    );
  }

  /**
   * Reads current devtools entries.
   *
   * @returns Recent devtools entries in chronological order.
   */
  getEntries(): readonly QuireDevtoolsEntry[] {
    return [...this.entries];
  }

  /**
   * Subscribes to recorder changes.
   *
   * @param subscriber - Listener invoked after entries change.
   * @returns Subscription handle.
   */
  subscribe(subscriber: QuireDevtoolsSubscriber): QuireDevtoolsSubscription {
    this.subscribers.add(subscriber);
    return {
      unsubscribe: () => {
        this.subscribers.delete(subscriber);
      }
    };
  }

  /** Clears recorded entries without removing subscribers. */
  clear(): void {
    if (this.entries.length === 0) {
      return;
    }

    this.entries.length = 0;
    this.notify();
  }

  /** Clears recorded entries and removes all subscribers. */
  destroy(): void {
    this.entries.length = 0;
    this.subscribers.clear();
  }

  /**
   * Stores one entry when the recorder is enabled.
   *
   * @param entry - Entry to store.
   * @returns Stored entry, or undefined when disabled.
   */
  private store<T extends QuireDevtoolsEntry>(entry: T): T | undefined {
    if (!this.enabled) {
      return undefined;
    }

    this.nextId += 1;
    this.appendEntry(entry);
    return entry;
  }

  /**
   * Stores one entry and notifies subscribers.
   *
   * @param entry - Entry to append.
   */
  private appendEntry(entry: QuireDevtoolsEntry): void {
    if (this.maxEntries === 0) {
      this.notify();
      return;
    }

    this.entries.push(entry);
    if (this.entries.length > this.maxEntries) {
      this.entries.splice(0, this.entries.length - this.maxEntries);
    }
    this.notify();
  }

  /** Notifies current subscribers. */
  private notify(): void {
    for (const subscriber of this.subscribers) {
      subscriber();
    }
  }
}
