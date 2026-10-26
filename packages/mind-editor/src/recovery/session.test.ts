import { afterEach, describe, expect, it, vi } from "vitest";
import { createMindMapDocument } from "@quirekit/mind-map";
import { createMindMapRecoverySession } from "./session";
import { mindMapRecoveryIdentity, readMindMapRecoveryRecord } from "./record";
import type { MindMapRecoveryRecord, MindMapRecoveryStore } from "./types";
import { bindMindMapRecovery, mindMapRecoveryFor } from "./binding";
import { createMindMapEmbed } from "@quirekit/mind-map";

/** @returns Atomic observable storage for scheduling and cross-session tests. */
function memory() {
  const rows = new Map<string, unknown>();
  const store: MindMapRecoveryStore = {
    /** @param key - Slot. @returns Stored value. */ async load(key) { return rows.get(key) ?? null; },
    save: vi.fn(async (key: string, token: string | null, record: MindMapRecoveryRecord) => {
      if (((rows.get(key) as MindMapRecoveryRecord | undefined)?.token ?? null) !== token) return false;
      rows.set(key, record); return true;
    }),
    /** @param key - Slot. @param token - Expected version. @returns Removal acceptance. */
    async remove(key, token) { if ((rows.get(key) as MindMapRecoveryRecord | undefined)?.token !== token) return false; rows.delete(key); return true; },
  };
  return { store, rows };
}
const source = createMindMapDocument({ text: "原正文", children: [] });
const checkpoint = { document: { ...source, root: { ...source.root, text: "未保存" } }, pending: {}, selectedId: source.root.id };
const base = "a".repeat(64);

describe("mind map local recovery", () => {
  afterEach(() => vi.useRealTimers());
  it("requires explicit identity and releases only the exact registration", () => {
    const owner = {}, request = { document: createMindMapEmbed("map"), commit: () => "saved" as const, release() {} };
    expect(mindMapRecoveryFor(owner, request)).toBeUndefined(); let id = "first";
    const old = bindMindMapRecovery(owner, { namespace: "classic", documentId: () => id });
    const captured = mindMapRecoveryFor(owner, request); id = "second";
    const next = bindMindMapRecovery(owner, { namespace: "classic", documentId: () => id }); old();
    expect(captured?.documentId).toBe("first"); expect(mindMapRecoveryFor(owner, request)?.documentId).toBe("second");
    expect(mindMapRecoveryFor(owner, { ...request, intent: "insert" })?.insertion).toBe(true);
    next(); expect(mindMapRecoveryFor(owner, request)).toBeUndefined();
  });
  it("scopes identities and ignores only insertion identities, never substantive content", async () => {
    const options = { namespace: "classic", documentId: "a", targetId: "map" };
    const first = await mindMapRecoveryIdentity(source, "标题", options);
    expect((await mindMapRecoveryIdentity(source, "标题", { ...options, documentId: "b" })).key).not.toBe(first.key);
    expect((await mindMapRecoveryIdentity({ ...source, revision: 1 }, "标题", options)).base).not.toBe(first.base);
    const insertion = { ...options, insertion: true };
    expect((await mindMapRecoveryIdentity({ ...source, root: { ...source.root, id: "new" } }, "标题", insertion)).base)
      .toBe((await mindMapRecoveryIdentity(source, "标题", insertion)).base);
    expect((await mindMapRecoveryIdentity(checkpoint.document, "标题", insertion)).base)
      .not.toBe((await mindMapRecoveryIdentity(source, "标题", insertion)).base);
  });
  it("preserves unfinished links without admitting them as canonical source", () => {
    const pending = { details: [{ ids: [source.root.id], patch: { link: "https://", note: "继续填写" } }] };
    const record = { version: 1, token: "record", updatedAt: 1, base, checkpoint: { ...checkpoint, pending } };
    expect(readMindMapRecoveryRecord(record).checkpoint.pending).toEqual(pending);
    expect(() => readMindMapRecoveryRecord({ ...record, unexpected: true })).toThrow();
    expect(() => readMindMapRecoveryRecord({ ...record, checkpoint: { ...checkpoint, pending: { details: [{ ids: ["missing"], patch: { note: "x" } }] } } })).toThrow();
    expect(() => readMindMapRecoveryRecord({ ...record, version: 99 })).toThrow();
  });
  it("keeps notifications constant work, coalesces idle and bounds continuous edits", async () => {
    vi.useFakeTimers(); const { store } = memory(), capture = vi.fn(() => checkpoint);
    const session = createMindMapRecoverySession({ key: "a", base, store, capture, changed() {} }); await session.ready;
    for (let i = 0; i < 100; i++) session.change(); expect(capture).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(800); expect(store.save).toHaveBeenCalledTimes(1);
    for (let i = 0; i < 10; i++) { session.change(); await vi.advanceTimersByTimeAsync(500); }
    expect(store.save).toHaveBeenCalledTimes(2); session.dispose();
  });
  it("skips composition and offers recovery before applying anything", async () => {
    const { store, rows } = memory(), capture = vi.fn().mockReturnValue(null);
    const options = { key: "a", base, store, capture, changed() {} };
    const session = createMindMapRecoverySession(options); await session.ready;
    session.change(); await session.checkpoint(); expect(rows.size).toBe(0);
    capture.mockReturnValue(checkpoint); await session.checkpoint(); session.dispose();
    const reopened = createMindMapRecoverySession(options); await reopened.ready;
    expect(reopened.state.status).toBe("recovery"); const apply = vi.fn(async () => {});
    expect(apply).not.toHaveBeenCalled(); await reopened.restore(apply); expect(apply).toHaveBeenCalledWith(checkpoint);
    await reopened.finish(); expect(rows.size).toBe(0);
  });
  it("preserves newer-tab data, stale baselines and unsupported stored records", async () => {
    const { store, rows } = memory(), options = { key: "a", base, store, capture: () => checkpoint, changed() {} };
    const first = createMindMapRecoverySession(options), second = createMindMapRecoverySession(options);
    await Promise.all([first.ready, second.ready]); first.change(); await first.checkpoint();
    second.change(); await second.checkpoint(); expect(second.state.status).toBe("unavailable");
    await second.finish(); expect(rows.size).toBe(1);
    const stale = createMindMapRecoverySession({ ...options, base: "b".repeat(64) }); await stale.ready;
    expect(stale.state.status).toBe("conflict"); await expect(stale.restore(vi.fn())).rejects.toThrow(); stale.dispose();
    rows.set("a", { version: 99 }); const unknown = createMindMapRecoverySession(options); await unknown.ready;
    expect(unknown.state.status).toBe("unavailable"); unknown.change(); await unknown.checkpoint(); await unknown.finish();
    expect(rows.get("a")).toEqual({ version: 99 }); first.dispose();
  });
  it("cannot resurrect an explicitly cleared draft after a slow write", async () => {
    const { store, rows } = memory(), original = store.save; let resume!: () => void;
    const wait = new Promise<void>(resolve => { resume = resolve; }); store.save = async (...args) => { await wait; return original(...args); };
    const session = createMindMapRecoverySession({ key: "a", base, store, capture: () => checkpoint, changed() {} }); await session.ready;
    session.change(); const writing = session.checkpoint(); await Promise.resolve(); const cleared = session.finish(); resume();
    await Promise.all([writing, cleared]); expect(rows.size).toBe(0); session.dispose();
  });
  it("coalesces slow storage invalidations and preserves one final unmount state", async () => {
    const { store, rows } = memory(), original = store.save; let resume!: () => void;
    const wait = new Promise<void>(resolve => { resume = resolve; }); store.save = async (...args) => { await wait; return original(...args); };
    let text = "第一批"; const capture = vi.fn(() => ({ ...checkpoint, document: { ...source, root: { ...source.root, text } } }));
    const session = createMindMapRecoverySession({ key: "a", base, store, capture, changed() {} }); await session.ready;
    session.change(); const writing = session.checkpoint(); await Promise.resolve();
    for (let i = 0; i < 100; i++) { text = `最后${i}`; session.change(); void session.checkpoint(); }
    expect(capture).toHaveBeenCalledTimes(1); session.dispose(); expect(capture).toHaveBeenCalledTimes(2);
    resume(); await writing; await session.checkpoint();
    expect((rows.get("a") as MindMapRecoveryRecord).checkpoint.document.root.text).toBe("最后99");
  });
});
