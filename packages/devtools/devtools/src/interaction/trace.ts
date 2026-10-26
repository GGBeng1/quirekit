import type {
  QuireDevtoolsEntry,
  QuireDevtoolsInteractionInput,
  QuireDevtoolsInteractionToken,
  QuireDevtoolsRecorder,
  QuireDevtoolsRenderEntry
} from "../types";

const defaultTimeoutMs = 180;

/** Options used by the interaction trace manager. */
export interface QuireDevtoolsInteractionTraceManagerOptions {
  /** Recorder that stores completed interaction traces. */
  readonly recorder: Pick<
    QuireDevtoolsRecorder,
    "finishInteraction" | "getEntries" | "startInteraction"
  >;
  /** Time after which a trace is recorded as not settled. */
  readonly timeoutMs?: number | undefined;
}

/** Pending interaction trace waiting for a render-settled frame. */
interface PendingInteractionTrace {
  /** Token returned by the recorder when the interaction started. */
  readonly token: QuireDevtoolsInteractionToken;
  /** Timer used to finish the trace when no render arrives. */
  readonly timeout: ReturnType<typeof setTimeout>;
}

/** Coordinates browser interactions with the next render-settled frame. */
export class QuireDevtoolsInteractionTraceManager {
  private readonly recorder: QuireDevtoolsInteractionTraceManagerOptions["recorder"];
  private readonly timeoutMs: number;
  private readonly pending: PendingInteractionTrace[] = [];
  private readonly cancelFrameCallbacks = new Set<() => void>();

  /**
   * Creates an interaction trace manager.
   *
   * @param options - Trace manager options.
   */
  constructor(options: QuireDevtoolsInteractionTraceManagerOptions) {
    this.recorder = options.recorder;
    this.timeoutMs = options.timeoutMs ?? defaultTimeoutMs;
  }

  /**
   * Starts one browser interaction trace.
   *
   * @param input - Interaction metadata.
   */
  start(input: QuireDevtoolsInteractionInput): void {
    const token = this.recorder.startInteraction(input);
    const timeout = setTimeout(() => {
      this.finish(token, false);
    }, this.timeoutMs);

    this.pending.push({ token, timeout });
  }

  /**
   * Settles pending traces whose start time is before a render entry.
   *
   * @param renderEntry - Render entry that can settle pending traces.
   */
  settleAfterRender(renderEntry: QuireDevtoolsRenderEntry | undefined): void {
    if (!renderEntry || this.pending.length === 0) {
      return;
    }

    const tokens = this.pending
      .filter((trace) => trace.token.startedAt <= renderEntry.startedAt)
      .map((trace) => trace.token);

    if (tokens.length === 0) {
      return;
    }

    const cancel = afterNextFrame(() => {
      this.cancelFrameCallbacks.delete(cancel);
      for (const token of tokens) {
        this.finish(token, true, renderEntry);
      }
    });
    this.cancelFrameCallbacks.add(cancel);
  }

  /** Clears pending traces and scheduled frame callbacks. */
  destroy(): void {
    for (const trace of this.pending) {
      clearTimeout(trace.timeout);
    }
    this.pending.length = 0;
    for (const cancel of this.cancelFrameCallbacks) {
      cancel();
    }
    this.cancelFrameCallbacks.clear();
  }

  /**
   * Finishes a trace when it is still pending.
   *
   * @param token - Pending interaction token.
   * @param settled - Whether a render-settled frame was observed.
   * @param renderEntry - Render entry that settled the trace.
   */
  private finish(
    token: QuireDevtoolsInteractionToken,
    settled: boolean,
    renderEntry?: QuireDevtoolsRenderEntry
  ): void {
    const index = this.pending.findIndex((trace) => trace.token === token);

    if (index === -1) {
      return;
    }

    const [trace] = this.pending.splice(index, 1);
    if (!trace) {
      return;
    }

    clearTimeout(trace.timeout);
    const entries = this.recorder.getEntries();
    const nextInteractionStartedAt = this.pending[index]?.token.startedAt;
    const operationEntryIds = collectEntryIdsInInteractionWindow(
      entries,
      token,
      "operation",
      nextInteractionStartedAt
    );
    const observedRenderEntryIds = collectEntryIdsInInteractionWindow(
      entries,
      token,
      "render",
      nextInteractionStartedAt
    );
    const renderEntryIds = renderEntry !== undefined &&
      !observedRenderEntryIds.includes(renderEntry.id)
      ? [...observedRenderEntryIds, renderEntry.id]
      : observedRenderEntryIds;
    this.recorder.finishInteraction(token, {
      settled,
      operationCount: operationEntryIds.length,
      renderCount: renderEntryIds.length,
      operationEntryIds,
      renderEntryIds,
      ...(renderEntry ? { renderEntryId: renderEntry.id } : {})
    });
  }
}

/**
 * Collects entries owned by one browser interaction time window.
 *
 * @param entries - Current recorder entries.
 * @param token - Interaction token whose start time is the lower bound.
 * @param kind - Entry kind to count.
 * @param endedBefore - Next interaction start, which closes this ownership window.
 * @returns Matching entry ids in chronological order.
 */
function collectEntryIdsInInteractionWindow(
  entries: readonly QuireDevtoolsEntry[],
  token: QuireDevtoolsInteractionToken,
  kind: QuireDevtoolsEntry["kind"],
  endedBefore?: number | undefined
): readonly number[] {
  return entries
    .filter((entry) => {
      return entry.kind === kind &&
        entry.startedAt >= token.startedAt &&
        (endedBefore === undefined || entry.startedAt < endedBefore);
    })
    .map((entry) => entry.id);
}

/**
 * Runs a callback after the browser has had a chance to paint a render.
 *
 * @param callback - Callback to run after one frame boundary.
 * @returns Function that cancels the scheduled callback when possible.
 */
function afterNextFrame(callback: () => void): () => void {
  if (typeof requestAnimationFrame !== "function") {
    const timeout = setTimeout(callback, 0);

    return () => {
      clearTimeout(timeout);
    };
  }

  const frame = requestAnimationFrame(callback);

  return () => {
    cancelAnimationFrame(frame);
  };
}
