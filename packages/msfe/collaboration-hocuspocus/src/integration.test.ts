import { afterEach, describe, expect, it, vi } from "vitest";
import { Server } from "@hocuspocus/server";
import { WebSocket as NodeWebSocket } from "ws";
import type { AddressInfo } from "node:net";
import * as Y from "yjs";
import { createCollaborationSession, type CollaborationSession } from "@quirekit/msfe-collaboration";
import { hocuspocusProvider } from "./provider";

const cleanup: (() => void | Promise<void>)[] = [];
afterEach(async () => { for (const dispose of cleanup.splice(0).reverse()) await dispose(); });

/** @returns Real authenticated Hocuspocus protocol plus a test-only application admission/checkpoint service. */
async function authority() {
  const seed = new Y.Doc(); seed.getText("source").insert(0, "shared");
  let persisted = Y.encodeStateAsUpdate(seed), failSave = false, checkpoints = 0, readerMessages = 0;
  const server = new Server({ address: "127.0.0.1", port: 0, quiet: true, stopOnSignals: false,
    async onAuthenticate({ token, documentName, connectionConfig }) {
      if (!["writer", "reader"].includes(token) || documentName !== "test:one") throw new Error("denied");
      connectionConfig.readOnly = token === "reader";
      return { role: token };
    },
    async beforeHandleMessage({ context }) { if (context.role === "reader") readerMessages++; },
    async onLoadDocument() { const doc = new Y.Doc(); Y.applyUpdate(doc, persisted); return doc; },
    async onRequest({ request, response }) {
      const token = request.headers.authorization?.replace(/^Bearer /, "");
      if (!["writer", "reader"].includes(token ?? "")) { response.writeHead(403).end(); throw undefined; }
      if (request.url === "/open") {
        response.setHeader("Content-Type", "application/json");
        response.end(JSON.stringify({ documentId: "test", epoch: "one", room: "test:one", permission: token === "writer" ? "write" : "read",
          sourceFormat: { bom: false, lineEnding: "\n" }, checkpointEndpoint: "/checkpoint", connectionToken: token })); throw undefined;
      }
      if (request.url === "/checkpoint") {
        if (token !== "writer") { response.writeHead(403).end(); throw undefined; }
        const chunks: Buffer[] = []; for await (const chunk of request) chunks.push(Buffer.from(chunk));
        if (failSave) { response.writeHead(503).end(); throw undefined; }
        const doc = server.hocuspocus.documents.get("test:one")!;
        Y.applyUpdate(doc, new Uint8Array(Buffer.concat(chunks))); persisted = Y.encodeStateAsUpdate(doc); checkpoints++;
        response.setHeader("Content-Type", "application/json");
        response.end(JSON.stringify({ documentId: decodeURIComponent(String(request.headers["x-msfe-document"])),
          epoch: decodeURIComponent(String(request.headers["x-msfe-epoch"])), requestId: request.headers["x-msfe-request"], revision: String(checkpoints) }));
        throw undefined;
      }
    },
  });
  await server.listen(); cleanup.push(async () => { await server.destroy(); seed.destroy(); });
  const { port } = server.httpServer.address() as AddressInfo;
  return { server, url: `ws://127.0.0.1:${port}`, sessionEndpoint: `http://127.0.0.1:${port}/open`,
    fail() { failSave = true; }, get persisted() { return persisted; }, get checkpoints() { return checkpoints; },
    get readerMessages() { return readerMessages; } };
}

/** @param service - Local test authority. @param token - Test permission. @returns Authenticated synchronized session. */
async function session(service: Awaited<ReturnType<typeof authority>>, token = "writer"): Promise<CollaborationSession> {
  const result = createCollaborationSession({ documentId: "test", provider: hocuspocusProvider({
    url: service.url, sessionEndpoint: service.sessionEndpoint, token, WebSocketPolyfill: NodeWebSocket as unknown as typeof WebSocket,
  }) });
  cleanup.push(() => result.close({ mode: "discard" }));
  await result.prepare(); return result;
}

describe("Hocuspocus optional transport", () => {
  it("opts into presence after sync, discovers existing members, withdraws, and reacquires without stale clocks", async () => {
    const service = await authority(), left = await session(service), right = await session(service);
    const a = left.acquirePresence(); a.publish({ name: "Alice" });
    await expect.poll(() => service.server.hocuspocus.documents.get("test:one")!.awareness.getStates().size).toBe(1);
    const b = right.acquirePresence();
    await expect.poll(() => b.getStates().get(a.clientId)).toEqual({ name: "Alice" });
    b.publish({ name: "Bob" });
    await expect.poll(() => a.getStates().get(b.clientId)).toEqual({ name: "Bob" });
    a.release(); a.release();
    await expect.poll(() => b.getStates().has(a.clientId)).toBe(false);
    const again = left.acquirePresence(); again.publish({ name: "Alice again" });
    await expect.poll(() => b.getStates().get(again.clientId)).toEqual({ name: "Alice again" });
    left.disconnect();
    await expect.poll(() => b.getStates().has(again.clientId)).toBe(false);
    await left.prepare(); const reconnected = left.acquirePresence(); reconnected.publish({ name: "Reconnected" });
    await expect.poll(() => b.getStates().get(reconnected.clientId)).toEqual({ name: "Reconnected" });
    reconnected.release(); b.release();
    await expect.poll(() => [...service.server.hocuspocus.documents.get("test:one")!.awareness.getStates().values()].filter(value => value.msfe != null).length).toBe(0);
    expect(left.document.getText("source").toString()).toBe("shared");
    expect(service.checkpoints).toBe(0);
  });
  it("keeps an idle document synced across the periodic resync, while local edits still report pending", async () => {
    vi.useFakeTimers({ toFake: ["setInterval", "clearInterval"] });
    cleanup.push(() => { vi.useRealTimers(); });
    const service = await authority(), left = await session(service);
    await expect.poll(() => left.state.synced).toBe(true);
    const states: boolean[] = [];
    const stop = left.subscribe(state => states.push(state.synced)); cleanup.push(stop);
    vi.advanceTimersByTime(15_000); vi.advanceTimersByTime(15_000);
    await new Promise(resolve => setTimeout(resolve, 200));
    expect(states).not.toContain(false);
    left.document.getText("source").insert(0, "x");
    expect(left.state.synced).toBe(false);
    await expect.poll(() => left.state.synced).toBe(true);
  });
  it("synchronizes source over real sockets with Awareness disabled, then separately persists deletes", async () => {
    const service = await authority(), left = await session(service), right = await session(service);
    expect(left.document.getText("source").toString()).toBe("shared");
    left.document.getText("source").delete(0, 3);
    await expect.poll(() => right.document.getText("source").toString()).toBe("red");
    expect(service.checkpoints).toBe(0);
    const receipt = await left.save(); expect(receipt.revision).toBe("1");
    const restored = new Y.Doc(); Y.applyUpdate(restored, service.persisted);
    expect(restored.getText("source").toString()).toBe("red"); restored.destroy();
    expect(service.server.hocuspocus.documents.get("test:one")!.awareness.getStates().size).toBe(0);
  });
  it("resynchronizes offline edits and retains data after a storage failure", async () => {
    const service = await authority(), left = await session(service), right = await session(service);
    left.disconnect(); left.document.getText("source").insert(0, "offline ");
    right.document.getText("source").insert(0, "online "); await left.prepare();
    await expect.poll(() => right.document.getText("source").toString()).toBe(left.document.getText("source").toString());
    service.fail(); await expect(left.save()).rejects.toThrow("collaboration-checkpoint-http-503");
    expect(left.checkpoint().source).toContain("offline"); expect(left.state.lifecycle).toBe("ready");
  });
  it("enforces read permission at the server and never grants a durable write receipt", async () => {
    const service = await authority(), reader = await session(service, "reader"), writer = await session(service);
    expect(reader.state.permission).toBe("read");
    await expect(reader.save()).rejects.toThrow("collaboration-readonly");
    writer.document.getText("source").insert(0, "W");
    await expect.poll(() => reader.document.getText("source").toString()).toBe("Wshared");
    // Exercise the authority guard even when a hostile client bypasses the editor's own readOnly gate.
    const handled = service.readerMessages; reader.document.getText("source").insert(0, "DENIED");
    await expect.poll(() => service.readerMessages).toBeGreaterThan(handled);
    expect(service.server.hocuspocus.documents.get("test:one")!.getText("source").toString()).toBe("Wshared");
    expect(writer.document.getText("source").toString()).toBe("Wshared");
  });
  it("fails admission with invalid credentials", async () => {
    const service = await authority(); await expect(session(service, "invalid")).rejects.toThrow("collaboration-admission-http-403");
  });
});
