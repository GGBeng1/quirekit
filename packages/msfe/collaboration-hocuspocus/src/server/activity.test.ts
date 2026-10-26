import { afterEach, describe, expect, it } from "vitest";
import { Server } from "@hocuspocus/server";
import { WebSocket as NodeWebSocket } from "ws";
import type { AddressInfo } from "node:net";
import * as Y from "yjs";
import { createCollaborationSession, relativeActivityResolver, type CollaborationSession } from "@quirekit/msfe-collaboration";
import { createMemoryActivityStore } from "@quirekit/edit-history/memory";
import { encodeActivityHint } from "@quirekit/edit-history/writer";
import type { PendingActivityEvent } from "@quirekit/edit-history";
import { HocuspocusProvider, HocuspocusProviderWebsocket } from "@hocuspocus/provider";
import { hocuspocusProvider } from "../provider";
import { createMsfeActivityExtension } from ".";

const cleanup: (() => void | Promise<void>)[] = [];
afterEach(async () => { for (const dispose of cleanup.splice(0).reverse()) await dispose(); });

/** @param store - Optional simple-mode store. @returns Authenticated Hocuspocus server with the activity extension. */
async function authority(store?: ReturnType<typeof createMemoryActivityStore>, persist?: (events: readonly PendingActivityEvent[]) => void) {
  const seed = new Y.Doc(); seed.getText("source").insert(0, "# Title\n\nfirst\n\nsecond");
  let persisted = Y.encodeStateAsUpdate(seed);
  const activity = createMsfeActivityExtension<{ user: string }>({ mergeMs: 200, holdMs: 150, graceMs: 100, ...(store ? { store } : {}),
    resolveActor: context => ({ id: context.user, name: context.user === "alice" ? "Alice" : "Bob", trust: "verified" }),
    commentsRoom: name => name.endsWith(":comments"),
    resolveDocument: name => name.startsWith("test:one") ? { documentId: "test", epoch: "one" } : null });
  const server = new Server({ address: "127.0.0.1", port: 0, quiet: true, stopOnSignals: false, debounce: 50, maxDebounce: 100, extensions: [activity],
    async onAuthenticate({ token }) { if (!["alice", "bob"].includes(token)) throw new Error("denied"); return { user: token }; },
    async onLoadDocument({ documentName }) { const doc = new Y.Doc(); if (!documentName.endsWith(":comments")) Y.applyUpdate(doc, persisted); return doc; },
    // The host writes the document and its pending activity in one transaction; a failure puts the events back.
    async onStoreDocument({ document, documentName }) {
      if (documentName.endsWith(":comments")) return;
      persisted = Y.encodeStateAsUpdate(document);
      if (!persist) return;
      const events = activity.takeActivity(documentName);
      try { persist(events); } catch (error) { activity.restoreActivity(documentName, events); throw error; }
    },
    async onRequest({ request, response }) {
      const token = request.headers.authorization?.replace(/^Bearer /, "");
      if (request.url === "/open") {
        response.setHeader("Content-Type", "application/json");
        response.end(JSON.stringify({ documentId: "test", epoch: "one", room: "test:one", permission: "write", sourceFormat: { bom: false, lineEnding: "\n" }, connectionToken: token }));
        throw undefined;
      }
    } });
  await server.listen(); cleanup.push(() => server.destroy());
  const { port } = server.httpServer.address() as AddressInfo;
  return { activity, url: `ws://127.0.0.1:${port}`, sessionEndpoint: `http://127.0.0.1:${port}/open` };
}

/** @param service - Test server. @param user - Token naming the user. @returns Synchronized session. */
async function join(service: Awaited<ReturnType<typeof authority>>, user: string): Promise<CollaborationSession> {
  const session = createCollaborationSession({ documentId: "test", provider: hocuspocusProvider({ url: service.url, sessionEndpoint: service.sessionEndpoint,
    token: user, WebSocketPolyfill: NodeWebSocket as unknown as typeof WebSocket }) });
  cleanup.push(() => session.close({ mode: "discard" }));
  await session.prepare(); return session;
}

/** @param session - Editing session. @param at - Source index. @param text - Inserted text. */
const insert = (session: CollaborationSession, at: number, text: string) => session.document.getText("source").insert(at, text);
/** @param service - Test server. @returns Taken events without session records. */
const edits = (service: Awaited<ReturnType<typeof authority>>, all: PendingActivityEvent[]) => { all.push(...service.activity.takeActivity("test:one")); return all.filter(event => !event.kind.startsWith("session.")); };

describe("server-confirmed MSFE activity", () => {
  it("records each authenticated change once, merges typing and keeps relative anchors", async () => {
    const service = await authority(), alice = await join(service, "alice"), bob = await join(service, "bob"), taken: PendingActivityEvent[] = [];
    const source = alice.document.getText("source");
    insert(alice, 14, "A"); insert(alice, 15, "B");
    await expect.poll(() => bob.document.getText("source").toString()).toContain("firstAB");
    insert(bob, bob.document.getText("source").length, "!");
    await expect.poll(() => alice.document.getText("source").toString()).toContain("second!");
    await new Promise(resolve => setTimeout(resolve, 400)); service.activity.flushTyping();
    const events = edits(service, taken);
    expect(events.map(event => `${event.actor.id}:${event.kind}:${event.facts.inserted}`)).toEqual(["alice:text.edit:2", "bob:text.edit:1"]);
    expect(events[0]).toMatchObject({ actor: { trust: "verified", name: "Alice" }, content: { before: "first", after: "firstAB", truncated: false } });
    insert(bob, 0, "Intro\n");
    await expect.poll(() => source.toString()).toMatch(/^Intro/u);
    const range = relativeActivityResolver(alice.document)(events[0]!.target!)!;
    expect(source.toString().slice(range.from, range.to)).toBe("firstAB");
    expect(taken.filter(event => event.kind === "session.join").map(event => event.actor.id).sort()).toEqual(["alice", "bob"]);
  });

  it("labels changes with plausible hints and ignores forged or unmatched ones", async () => {
    const service = await authority(), alice = await join(service, "alice"), taken: PendingActivityEvent[] = [];
    const table = "\n\n| a | b |\n| --- | --- |\n| 1 | 2 |";
    alice.sendStateless(encodeActivityHint({ operationId: "op-table", kind: "block.insert", kindVersion: 1, facts: { type: "table" }, delta: table.length }));
    insert(alice, alice.document.getText("source").length, table);
    alice.sendStateless(encodeActivityHint({ operationId: "op-forged", kind: "block.insert", kindVersion: 1, facts: { type: "highlight" }, delta: 5 }));
    insert(alice, 0, "plain");
    await new Promise(resolve => setTimeout(resolve, 500)); service.activity.flushTyping();
    const events = edits(service, taken);
    expect(events.map(event => `${event.kind}:${event.operationId}`)).toEqual(["block.insert:op-table", `text.edit:${events[1]!.operationId}`]);
    expect(events[0]!.facts).toMatchObject({ type: "table" });
    expect(events[1]!.operationId).not.toBe("op-forged");
  });

  it("continues a session across quick reconnects and records the leave after the grace window", async () => {
    const service = await authority(), alice = await join(service, "alice"), taken: PendingActivityEvent[] = [];
    alice.disconnect(); await alice.prepare();
    await new Promise(resolve => setTimeout(resolve, 50));
    alice.disconnect();
    await new Promise(resolve => setTimeout(resolve, 250));
    taken.push(...service.activity.takeActivity("test:one"));
    expect(taken.map(event => event.kind)).toEqual(["session.join", "session.leave"]);
  });

  it("appends after the document store in simple mode", async () => {
    const store = createMemoryActivityStore(), service = await authority(store), alice = await join(service, "alice");
    alice.sendStateless(encodeActivityHint({ operationId: "op-quote", kind: "block.insert", kindVersion: 1, facts: { type: "quote" }, delta: 8 }));
    insert(alice, 0, "> Quote\n");
    await expect.poll(() => store.snapshot("test").map(event => event.operationId), { timeout: 3000 }).toContain("op-quote");
    expect(service.activity.takeActivity("test:one").filter(event => event.operationId === "op-quote")).toHaveLength(0);
  });

  it("records comment actions from the comment room with connection authors and no extra joins", async () => {
    const service = await authority(), alice = await join(service, "alice"), taken: PendingActivityEvent[] = [];
    const room = new Y.Doc(), socket = new HocuspocusProviderWebsocket({ url: service.url, WebSocketPolyfill: NodeWebSocket as unknown as typeof WebSocket });
    const provider = new HocuspocusProvider({ websocketProvider: socket, name: "test:one:comments", document: room, token: "alice", awareness: null });
    provider.attach();
    cleanup.push(() => { provider.destroy(); socket.destroy(); room.destroy(); });
    await expect.poll(() => provider.isSynced).toBe(true);
    const threads = room.getMap("threads"), thread = new Y.Map<unknown>(), messages = new Y.Map<unknown>();
    room.transact(() => {
      threads.set("t1", thread); thread.set("anchor", { quote: { exact: "first", prefix: "", suffix: "" } }); thread.set("resolution", { resolved: false });
      thread.set("messages", messages); messages.set("m1", { id: "m1", parentId: null, body: "Please check", author: { id: "spoofed", name: "X" } });
    });
    messages.set("m2", { id: "m2", parentId: "m1", body: "Done" });
    thread.set("resolution", { resolved: true });
    threads.delete("t1");
    await new Promise(resolve => setTimeout(resolve, 300));
    taken.push(...service.activity.takeActivity("test:one:comments"));
    expect(taken.map(event => `${event.kind}:${event.actor.id}`)).toEqual(["comment.add:alice", "comment.reply:alice", "comment.resolve:alice", "comment.remove:alice"]);
    expect(taken[0]).toMatchObject({ documentId: "test", facts: { threadId: "t1" }, target: { scheme: "comment-thread", quote: "first" }, content: { after: "Please check" } });
    expect(service.activity.takeActivity("test:one").filter(event => event.kind === "session.join").map(event => event.actor.id)).toEqual(["alice"]);
    void alice;
  });

  it("keeps activity when the host store transaction fails and writes it once on the next store", async () => {
    const persisted: PendingActivityEvent[] = [];
    let fail = true;
    const service = await authority(undefined, events => { if (fail) { fail = false; throw new Error("database down"); } persisted.push(...events); });
    const alice = await join(service, "alice");
    // The first store fails once after taking its events (the join); they must survive into a later store.
    insert(alice, 0, "x");
    await expect.poll(() => fail, { timeout: 4000 }).toBe(false);
    const list = "\n\n- item";
    alice.sendStateless(encodeActivityHint({ operationId: "op-list", kind: "block.insert", kindVersion: 1, facts: { type: "list" }, delta: list.length }));
    insert(alice, alice.document.getText("source").length, list);
    await expect.poll(() => persisted.some(event => event.operationId === "op-list"), { timeout: 4000 }).toBe(true);
    insert(alice, 0, "y");
    await new Promise(resolve => setTimeout(resolve, 400)); service.activity.flushTyping(); insert(alice, 0, "z");
    await expect.poll(() => persisted.filter(event => event.kind === "text.edit").length, { timeout: 4000 }).toBeGreaterThan(0);
    expect(persisted.filter(event => event.operationId === "op-list")).toHaveLength(1);
    expect(persisted.filter(event => event.kind === "session.join")).toHaveLength(1);
  });
});
