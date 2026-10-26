import { WhiteboardError } from "@quirekit/whiteboard";
import { readDraftRecord } from "./record";
import type { DraftSession, DraftSessionOptions, WhiteboardDraftState } from "./types";
import { v4 as uuidv4 } from "uuid";

/** @param options - One immutable target and passive runtime capture. @returns Recoverable local editing session. */
export function createDraftSession(options: DraftSessionOptions): DraftSession {
  let state: WhiteboardDraftState = { status: "loading" }, token: string | null = null;
  let revision = 0, queued = 0, ended = false, clearing = false, writing = false, queue = Promise.resolve();
  let idle: ReturnType<typeof setTimeout> | undefined, maximum: ReturnType<typeof setTimeout> | undefined;
  /** @param next - Infrequent storage state. */
  function publish(next: WhiteboardDraftState): void { state = next; if (!ended) options.changed(state); }
  /** @param error - Storage or validation failure; source remains in the runtime. */
  function fail(error: unknown): void { publish({ ...state, status: "unavailable", error }); }
  /** Cancels both scheduling bounds without touching stored data. */
  function cancel(): void { clearTimeout(idle); clearTimeout(maximum); idle = undefined; maximum = undefined; }
  /** Schedules an idle checkpoint without postponing continuous edits forever. */
  function schedule(): void {
    if (ended || state.status !== "ready") return;
    clearTimeout(idle); idle = setTimeout(() => { void checkpoint(); }, 800);
    maximum ??= setTimeout(() => { void checkpoint(); }, 5000);
  }
  /** O(1) source invalidation; neither PNG nor JSON work runs on input events. */
  function change(): void {
    if (ended) return;
    revision++;
    if (state.status === "ready" && !state.pending) publish({ ...state, pending: true });
    schedule();
  }
  /** @param closing - Allows one final capture before the runtime disappears. @returns Completion of queued writes; capture never changes input focus. */
  function checkpoint(closing = false): Promise<void> {
    cancel();
    if (ended || state.status !== "ready" || revision === queued) return queue;
    // Slow storage must not accumulate a full scene for every idle period.
    // Keep only invalidations until it finishes, plus one final unmount capture.
    if (writing && !closing) { schedule(); return queue; }
    try {
      const scene = options.capture();
      if (!scene) { schedule(); return queue; }
      const record = readDraftRecord({ version: 1, token: uuidv4(), updatedAt: Date.now(), base: options.base, scene });
      const captured = revision; queued = captured; writing = true;
      // Serialize writes within this session; the store compares the observed
      // token atomically across sessions, so a second tab cannot overwrite it.
      queue = queue.then(async () => {
        if (clearing || state.status !== "ready") return;
        if (!await options.store.save(options.key, token, record)) throw new WhiteboardError("draftUpdated", "另一页面已更新本机草稿，当前修改请导出保存");
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
        const record = readDraftRecord(value); token = record.token;
        publish({ status: record.base === options.base ? "recovery" : "conflict", candidate: record });
      }
    } catch (error) { fail(error); }
  })();
  /** @returns Whether only the checkpoint this session observed was removed. */
  async function remove(): Promise<boolean> {
    if (!token) return true;
    try {
      if (!await options.store.remove(options.key, token)) throw new WhiteboardError("draftRemoved", "本机草稿已由另一页面更新，已保留该版本");
      token = null; return true;
    } catch (error) { fail(error); return false; }
  }
  return {
    ready,
    /** @returns Last published storage state, including after lifecycle disposal. */
    get state() { return state; },
    change, checkpoint,
    /** @param apply - User-approved import, with no host document mutation. @returns Restore completion. */
    async restore(apply) {
      if (ended || state.status !== "recovery" || !state.candidate) throw new WhiteboardError("draftStale", "正文版本已变化，无法直接恢复该草稿");
      await apply(state.candidate.scene);
      if (!ended) { publish({ status: "ready", savedAt: state.candidate.updatedAt }); change(); }
    },
    /** @returns Whether the explicit recovery discard succeeded. */
    async discard() {
      if (ended || !state.candidate) return false;
      if (!await remove()) return false;
      publish({ status: "ready" }); return true;
    },
    /** @returns Clear completion after queued writes settle; a late write cannot recreate a cleared draft. */
    async finish() {
      ended = true; clearing = true; cancel(); await ready; await queue; return remove();
    },
    /** Preserves the last stable source on forced unmount instead of treating it as a discard. */
    dispose() { if (ended) return; void checkpoint(true); ended = true; cancel(); },
  };
}
