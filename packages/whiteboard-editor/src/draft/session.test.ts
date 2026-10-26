import { describe, expect, it, vi, afterEach } from "vitest";
import { createWhiteboardDocument } from "@quirekit/whiteboard";
import { createDraftSession } from "./session";
import { draftIdentity, readDraftRecord } from "./record";
import { bindWhiteboardDrafts, whiteboardDraftsFor } from "./binding";
import type { WhiteboardDraftRecord, WhiteboardDraftStore } from "./types";

/** @returns Independent atomic store with observable writes. */
function memoryStore() {
  const rows = new Map<string, unknown>();
  const store: WhiteboardDraftStore = {
    async load(key) { return rows.get(key) ?? null; },
    save: vi.fn(async (key, token, record) => {
      if (((rows.get(key) as WhiteboardDraftRecord | undefined)?.token ?? null) !== token) return false;
      rows.set(key, record); return true;
    }),
    async remove(key, token) {
      if ((rows.get(key) as WhiteboardDraftRecord | undefined)?.token !== token) return false;
      rows.delete(key); return true;
    },
  };
  return { store, rows };
}
const board = createWhiteboardDocument("board");
const scene = { ...board.scene, appState: { viewBackgroundColor: "#ffeecc" } };

describe("whiteboard recovery", () => {
  afterEach(() => vi.useRealTimers());
  it("isolates host documents and ignores only an insertion's fresh random identity", async () => {
    const a = await draftIdentity(board, { namespace: "classic", documentId: "a" });
    const b = await draftIdentity(board, { namespace: "classic", documentId: "b" });
    expect(a.key).not.toBe(b.key);
    expect((await draftIdentity({ ...board, revision: 1 }, { namespace: "classic", documentId: "a" })).base).not.toBe(a.base);
    expect((await draftIdentity({ ...board, id: "new" }, { namespace: "classic", documentId: "a", insertion: true })).base)
      .toBe((await draftIdentity(board, { namespace: "classic", documentId: "a", insertion: true })).base);
  });
  it("requires explicit host identity and captures the current binding", () => {
    const owner = {}, request = { document: board, commit: () => "saved" as const, release() {} };
    expect(whiteboardDraftsFor(owner, request)).toBeUndefined();
    let id = "first";
    const release = bindWhiteboardDrafts(owner, { namespace: "classic", documentId: () => id });
    const captured = whiteboardDraftsFor(owner, request); id = "second";
    expect(captured?.documentId).toBe("first"); expect(whiteboardDraftsFor(owner, request)?.documentId).toBe("second");
    release(); expect(whiteboardDraftsFor(owner, request)).toBeUndefined();
  });
  it("coalesces invalidations without serializing on every change and retries active input", async () => {
    vi.useFakeTimers(); const { store, rows } = memoryStore();
    const capture = vi.fn().mockReturnValue(null);
    const session = createDraftSession({ key: "a", base: "a".repeat(64), store, capture, changed() {} });
    await session.ready;
    for (let i = 0; i < 100; i++) session.change();
    expect(capture).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(800); expect(rows.size).toBe(0);
    capture.mockReturnValue(scene);
    await vi.advanceTimersByTimeAsync(800); expect(rows.size).toBe(1); expect(store.save).toHaveBeenCalledTimes(1);
    session.dispose();
  });
  it("offers recovery without applying it and keeps another window's newer draft", async () => {
    const { store, rows } = memoryStore();
    const options = { key: "a", base: "a".repeat(64), store, capture: () => scene, changed() {} };
    const first = createDraftSession(options), second = createDraftSession(options);
    await Promise.all([first.ready, second.ready]); first.change(); await first.checkpoint();
    second.change(); await second.checkpoint(); expect(second.state.status).toBe("unavailable");
    await second.finish(); expect(rows.size).toBe(1);
    const reopened = createDraftSession(options); await reopened.ready;
    expect(reopened.state.status).toBe("recovery"); expect(reopened.state.candidate?.scene).toEqual(scene);
    const apply = vi.fn(); await reopened.restore(apply); expect(apply).toHaveBeenCalledWith(scene);
    await reopened.finish(); expect(rows.size).toBe(0); first.dispose(); second.dispose(); reopened.dispose();
  });
  it("refuses a stale baseline and preserves malformed or unsupported stored data", async () => {
    const { store, rows } = memoryStore();
    rows.set("a", { version: 1, token: "old", updatedAt: 1, base: "b".repeat(64), scene });
    const session = createDraftSession({ key: "a", base: "a".repeat(64), store, capture: () => scene, changed() {} });
    await session.ready; expect(session.state.status).toBe("conflict");
    await expect(session.restore(vi.fn())).rejects.toThrow();
    session.dispose(); expect(rows.size).toBe(1);
    rows.set("a", { version: 99 });
    const invalid = createDraftSession({ key: "a", base: "a".repeat(64), store, capture: () => scene, changed() {} });
    await invalid.ready; expect(invalid.state.status).toBe("unavailable");
    invalid.change(); await invalid.checkpoint(); await invalid.finish(); expect(rows.get("a")).toEqual({ version: 99 });
    expect(() => readDraftRecord({ version: 1, scene: { ...scene, elements: Array(10_001).fill({}) } })).toThrow();
  });
  it("cannot resurrect a cleared draft when its pending write finishes late", async () => {
    const { store, rows } = memoryStore();
    const save = store.save; let resume!: () => void;
    const pending = new Promise<void>(resolve => { resume = resolve; });
    store.save = async (...args) => { await pending; return save(...args); };
    const session = createDraftSession({ key: "a", base: "a".repeat(64), store, capture: () => scene, changed() {} });
    await session.ready; session.change(); const writing = session.checkpoint();
    await Promise.resolve();
    const cleared = session.finish(); session.change(); resume(); await Promise.all([writing, cleared]);
    session.dispose(); expect(rows.size).toBe(0);
  });
  it("coalesces edits behind slow storage while preserving one final unmount checkpoint", async () => {
    const { store, rows } = memoryStore(); const save = store.save;
    let resume!: () => void;
    const pending = new Promise<void>(resolve => { resume = resolve; });
    store.save = async (...args) => { await pending; return save(...args); };
    const capture = vi.fn(() => scene);
    const session = createDraftSession({ key: "a", base: "a".repeat(64), store, capture, changed() {} });
    await session.ready; session.change(); const writing = session.checkpoint(); await Promise.resolve();
    for (let i = 0; i < 100; i++) { session.change(); void session.checkpoint(); }
    expect(capture).toHaveBeenCalledTimes(1); expect(session.state.pending).toBe(true);
    session.dispose(); expect(capture).toHaveBeenCalledTimes(2);
    resume(); await writing; await session.checkpoint();
    expect(rows.size).toBe(1); expect(save).toHaveBeenCalledTimes(2);
  });
  it("bounds continuous editing checkpoints and keeps the previous good draft on quota failure", async () => {
    vi.useFakeTimers(); const { store, rows } = memoryStore();
    const capture = vi.fn(() => scene);
    const session = createDraftSession({ key: "a", base: "a".repeat(64), store, capture, changed() {} });
    await session.ready;
    for (let i = 0; i < 50; i++) { session.change(); await vi.advanceTimersByTimeAsync(100); }
    expect(capture).toHaveBeenCalledTimes(1); expect(rows.size).toBe(1);
    const previous = rows.get("a");
    store.save = async () => { throw new DOMException("quota exceeded", "QuotaExceededError"); };
    session.change(); await session.checkpoint();
    expect(session.state.status).toBe("unavailable"); expect(rows.get("a")).toEqual(previous);
    session.dispose();
  });
});
