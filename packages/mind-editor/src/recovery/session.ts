import { MindMapRecoveryError } from "./errors";
import { readMindMapRecoveryRecord } from "./record";
import type { MindMapRecoverySession, MindMapRecoverySessionOptions, MindMapRecoveryState } from "./types";
import { v4 as uuidv4 } from "uuid";

/** @param options - Immutable task identity, passive capture and atomic storage. @returns Independent local recovery lifecycle. */
export function createMindMapRecoverySession(options: MindMapRecoverySessionOptions): MindMapRecoverySession {
  let state: MindMapRecoveryState = { status: "loading" }, token: string | null = null;
  let revision = 0, queued = 0, ended = false, clearing = false, writing = false, queue = Promise.resolve();
  let idle: ReturnType<typeof setTimeout> | undefined, maximum: ReturnType<typeof setTimeout> | undefined;
  /** @param next - Infrequent storage state. */
  function publish(next: MindMapRecoveryState): void { state = next; if (!ended) options.changed(state); }
  /** @param error - Failure, preserving current editing and the prior stored record. */
  function fail(error: unknown): void { publish({ ...state, status: "unavailable", error }); }
  /** Cancels both bounds without altering storage. */
  function cancel(): void { clearTimeout(idle); clearTimeout(maximum); idle = undefined; maximum = undefined; }
  /** Coalesces idle input with a maximum checkpoint interval for continuous editing. */
  function schedule(): void {
    if (ended || state.status !== "ready") return;
    clearTimeout(idle); idle = setTimeout(() => { void checkpoint(); }, 800);
    maximum ??= setTimeout(() => { void checkpoint(); }, 5000);
  }
  /** O(1) invalidation; model reads and serialization are checkpoint-only work. */
  function change(): void {
    if (ended) return;
    revision++; if (state.status === "ready" && !state.pending) publish({ ...state, pending: true }); schedule();
  }
  /** @param closing - Allows one final capture before input is disposed. @returns Ordered writes, without committing text or stealing focus. */
  function checkpoint(closing = false): Promise<void> {
    cancel();
    if (ended || state.status !== "ready" || revision === queued) return queue;
    if (writing && !closing) { schedule(); return queue; }
    try {
      const capturedSource = options.capture();
      if (!capturedSource) { schedule(); return queue; }
      const record = readMindMapRecoveryRecord({ version: 1, token: uuidv4(), updatedAt: Date.now(), base: options.base, checkpoint: capturedSource });
      const captured = revision; queued = captured; writing = true;
      // One session orders writes; transaction-local comparison owns cross-tab
      // consistency. A slow store accumulates generations, not full source copies.
      queue = queue.then(async () => {
        if (clearing || state.status !== "ready") return;
        if (!await options.store.save(options.key, token, record)) throw new MindMapRecoveryError("draftChanged");
        token = record.token; publish({ status: "ready", savedAt: record.updatedAt, pending: revision !== captured });
      }).catch(fail).finally(() => { writing = false; if (revision !== queued) schedule(); });
    } catch (error) { fail(error); }
    return queue;
  }
  const ready = (async () => {
    try {
      const value = await options.store.load(options.key);
      if (value === null) publish({ status: "ready" });
      else {
        const record = readMindMapRecoveryRecord(value); token = record.token;
        publish({ status: record.base === options.base ? "recovery" : "conflict", candidate: record });
      }
    } catch (error) { fail(error); }
  })();
  /** @returns Removal of only the version this session actually observed. */
  async function remove(): Promise<boolean> {
    if (!token) return true;
    try {
      if (!await options.store.remove(options.key, token)) throw new MindMapRecoveryError("draftChanged");
      token = null; return true;
    } catch (error) { fail(error); return false; }
  }
  return {
    ready,
    /** @returns Last storage admission state, including after disposal. */ get state() { return state; },
    change, checkpoint,
    /** @param apply - User-approved workspace restore, never a host commit. @returns Restore completion. */
    async restore(apply) {
      if (ended || state.status !== "recovery" || !state.candidate) throw new MindMapRecoveryError("draftStale");
      await apply(state.candidate.checkpoint);
      if (!ended) { publish({ status: "ready", savedAt: state.candidate.updatedAt }); change(); }
    },
    /** @returns Whether the explicit candidate discard succeeded. */
    async discard() { if (ended || !state.candidate || !await remove()) return false; publish({ status: "ready" }); return true; },
    /** @returns Completion of explicit save/cancel clearing, after all previous writes. */
    async finish() { ended = true; clearing = true; cancel(); await ready; await queue; return remove(); },
    /** Preserves the last stable native value on forced unmount; never treats it as explicit cancellation. */
    dispose() { if (ended) return; void checkpoint(true); ended = true; cancel(); },
  };
}
