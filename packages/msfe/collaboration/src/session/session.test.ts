import { afterEach, describe, expect, it } from "vitest";
import * as Y from "yjs";
import { createMsfeEditor } from "@quirekit/msfe-core";
import { Collaboration } from "../extension/collaboration";
import { CollaborationSession, createCollaborationSession } from "./session";
import { TestAuthority } from "./fixtures";

const cleanup: (() => void | Promise<void>)[] = [];
afterEach(async () => { for (const dispose of cleanup.splice(0).reverse()) await dispose(); document.body.replaceChildren(); });

/** @param authority - Shared source owner. @returns Prepared session with a real mounted editor. */
async function mount(authority: TestAuthority) {
  const session = createCollaborationSession({ documentId: "test", provider: authority.provider() });
  await session.prepare();
  const editor = createMsfeEditor({ parent: document.body.appendChild(document.createElement("div")), extensions: [Collaboration.configure({ session })] });
  cleanup.push(async () => { editor.destroy(); await session.close({ mode: "discard" }); });
  return { session, editor };
}

/** @param text - Initial source. @returns Fake authority disposed after the test. */
function room(text = "source"): TestAuthority { const authority = new TestAuthority(text); cleanup.push(() => authority.destroy()); return authority; }

describe("host-owned collaboration lifecycle and durable checkpoints", () => {
  it("initializes both clients from one identity, including an existing empty document", async () => {
    const authority = room(""); const left = await mount(authority), right = await mount(authority);
    expect(left.editor.getMarkdown()).toBe("");
    left.editor.commands.insertText("once"); expect(right.editor.getMarkdown()).toBe("once");
    expect(left.session.state.durability).toBe("dirty"); expect(right.session.state.lifecycle).toBe("ready");
  });
  it("checkpoints delete-only changes, retaining the CRDT identity on reload", async () => {
    const authority = room("delete me"), { editor, session } = await mount(authority);
    editor.applyChanges({ documentId: "test", baseRevision: editor.revision, changes: { from: 0, to: 9 } });
    const receipt = await session.save(); expect(receipt.revision).toBe("saved");
    expect(session.state.durability).toBe("persisted");
    const restored = new Y.Doc(); Y.applyUpdate(restored, Y.encodeStateAsUpdate(authority.persisted));
    expect(restored.getText("source").toString()).toBe(""); restored.destroy();
  });
  it("never marks edits made during a pending save as persisted", async () => {
    const authority = room(), { editor, session } = await mount(authority);
    let finish!: () => void; authority.gate = new Promise(resolve => { finish = resolve; });
    editor.commands.insertText("first"); const save = session.save();
    editor.commands.insertText("second"); finish(); await save;
    expect(session.state.durability).toBe("dirty"); await session.save();
    expect(session.state.durability).toBe("persisted");
  });
  it("retains exact request identity after a failed save and rejects mismatched receipts", async () => {
    const authority = room(), { editor, session } = await mount(authority);
    editor.commands.insertText("pending"); authority.failSave = true;
    await expect(session.save()).rejects.toThrow("storage-failed");
    authority.failSave = false; authority.wrongReceipt = true;
    await expect(session.save()).rejects.toThrow("collaboration-invalid-receipt");
    authority.wrongReceipt = false; await session.save();
    expect(new Set(authority.requests.map(r => r.requestId)).size).toBe(1);
    expect(session.state.durability).toBe("persisted");
  });
  it("buffers offline edits and rejoins the same binary identity", async () => {
    const authority = room("AB"), left = await mount(authority), right = await mount(authority);
    left.session.disconnect(); left.editor.commands.insertText("L"); right.editor.commands.insertText("R");
    await left.session.prepare();
    expect(left.editor.getMarkdown()).toBe(right.editor.getMarkdown());
    expect(left.editor.getMarkdown()).toContain("L"); expect(left.editor.getMarkdown()).toContain("R");
  });
  it("retains unsent source after an epoch change and blocks further local writes", async () => {
    const authority = room(), { editor, session } = await mount(authority);
    session.disconnect(); editor.commands.insertText("offline"); authority.epoch = "replacement";
    await expect(session.prepare()).rejects.toThrow("collaboration-epoch-changed");
    expect(session.state.lifecycle).toBe("recovery"); expect(editor.commands.insertText("bad")).toBe(false);
    expect(session.checkpoint().source).toContain("offline");
  });
  it("keeps failed close recoverable, then releases only after a recovery copy succeeds", async () => {
    const authority = room(), { editor, session } = await mount(authority);
    editor.commands.insertText("unsaved"); editor.destroy(); authority.failSave = true;
    await expect(session.close({ mode: "persist" })).rejects.toThrow("storage-failed");
    expect(session.state.lifecycle).toBe("ready");
    let source = "";
    await session.close({ mode: "checkpoint", persistRecovery: async record => { source = record.source; } });
    expect(source).toContain("unsaved"); expect(session.state.lifecycle).toBe("closed");
  });
  it("cancels preparation without mounting or accepting a late completion", async () => {
    const controller = new AbortController(); let resolve!: (value: never) => void;
    const session = createCollaborationSession({ documentId: "test", provider: () => ({
      open: () => new Promise(done => { resolve = done; }), connect: async () => {}, disconnect() {}, destroy() {},
    }) });
    cleanup.push(() => session.close({ mode: "discard" }));
    const ready = session.prepare({ signal: controller.signal }); controller.abort(new Error("cancelled"));
    await expect(ready).rejects.toThrow("cancelled");
    resolve({ documentId: "test", epoch: "one", permission: "write", sourceFormat: { bom: false, lineEnding: "\n" } } as never);
    await Promise.resolve(); expect(session.state.lifecycle).toBe("failed");
    expect(() => session.acquire()).toThrow("collaboration-session-not-ready");
  });
  it("does not let a readonly authority be overridden by UI permissions", async () => {
    const authority = room(); authority.permission = "read";
    const { editor, session } = await mount(authority); editor.setReadOnly(false);
    expect(editor.commands.insertText("denied")).toBe(false); await expect(session.save()).rejects.toThrow("collaboration-readonly");
  });
  it("captures the latest remote source after the editor is detached", async () => {
    const authority = room(), left = await mount(authority), right = await mount(authority);
    left.editor.destroy(); right.editor.commands.insertText("remote ");
    expect(left.session.checkpoint().source).toBe(right.editor.getMarkdown());
  });
  it("preserves an offline branch when reconnect admission revokes write permission", async () => {
    const authority = room(), { editor, session } = await mount(authority);
    session.disconnect(); editor.commands.insertText("offline "); authority.permission = "read";
    await expect(session.prepare()).rejects.toThrow("collaboration-permission-revoked");
    expect(session.state.lifecycle).toBe("recovery"); expect(editor.commands.insertText("denied")).toBe(false);
    expect(session.checkpoint().source).toContain("offline ");
    expect(authority.document.getText("source").toString()).toBe("source");
  });
  it("does not overwrite a transport permission downgrade with the admission snapshot", async () => {
    const authority = room(), factory = authority.provider();
    const session = createCollaborationSession({ documentId: "test", provider: context => {
      const provider = factory(context);
      return { ...provider, connect: async (manifest, signal) => {
        await provider.connect(manifest, signal); context.report({ permission: "read" });
      } };
    } });
    cleanup.push(() => session.close({ mode: "discard" })); await session.prepare();
    expect(session.state.permission).toBe("read");
  });
  it("settles a pending preparation promptly when the host disconnects", async () => {
    const session = createCollaborationSession({ documentId: "test", provider: () => ({
      open: () => new Promise(() => {}), connect: async () => {}, disconnect() {}, destroy() {},
    }) });
    cleanup.push(() => session.close({ mode: "discard" }));
    const pending = session.prepare(); session.disconnect();
    await expect(pending).rejects.toThrow("collaboration-disconnected");
    expect(session.state.lifecycle).toBe("failed");
  });
  it("does not claim durable save for a provider without that capability", async () => {
    const authority = room(), factory = authority.provider();
    const session = new CollaborationSession({ documentId: "test", provider: context => {
      const { saveCheckpoint: _save, ...provider } = factory(context); return provider;
    } });
    cleanup.push(() => session.close({ mode: "discard" })); await session.prepare();
    expect(session.state.durability).toBe("unsupported");
    await expect(session.save()).rejects.toThrow("collaboration-durability-unsupported");
    await expect(session.close({ mode: "persist" })).rejects.toThrow("collaboration-durability-unsupported");
  });
  it("keeps accepted event order when a synchronous peer transport sends a callback edit back", async () => {
    const authority = room(), left = await mount(authority), right = await mount(authority);
    const revisions: number[] = [];
    left.editor.onChange(event => revisions.push(event.revision));
    const off = right.editor.onChange(event => { if (event.origin === "remote") right.editor.commands.insertText("reply "); });
    left.editor.commands.insertText("local "); off();
    expect(left.editor.getMarkdown()).toBe(right.editor.getMarkdown());
    expect(revisions).toEqual([1, 2]);
  });
});
