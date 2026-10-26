import { afterEach, describe, expect, it, vi } from "vitest";
import { EditorSelection } from "@quirekit/cm-state";
import { createMsfeEditor, type MsfeEditor } from "@quirekit/msfe-core";
import * as Y from "yjs";
import { createCollaborationSession } from "../session/session";
import { Collaboration } from "../extension/collaboration";
import { CollaborationPresence } from "./extension";
import { encodePacket } from "./wire";
import { presenceState } from "./projection/state";
import type { PresenceController } from "./controller";

const disposals: (() => void | Promise<void>)[] = [];
const alice = { id: "a", name: "Alice", color: "#2563eb" }, bob = { id: "b", name: "<b>Bob</b>", color: "#a855b5" };
afterEach(async () => { for (const dispose of disposals.splice(0).reverse()) await dispose(); vi.useRealTimers(); document.body.replaceChildren(); });

/** @param enabled - Whether presence is explicitly installed. @returns One real editor with a deterministic ephemeral transport. */
async function fixture(enabled = true) {
  const states = new Map<string, unknown>(), listeners = new Set<() => void>();
  const published = vi.fn(), released = vi.fn(), acquired = vi.fn(), members = vi.fn();
  /** Notifies receivers without using any document transaction. */
  const notify = () => { for (const listener of listeners) listener(); };
  const session = createCollaborationSession({ documentId: "presence-test", provider: context => ({
    async open() { return { documentId: context.documentId, epoch: "one", permission: "write", sourceFormat: { bom: false, lineEnding: "\n" } }; },
    async connect() { if (!context.document.getText("source").length) context.document.getText("source").insert(0, "Hello 😀 world"); context.report({ connection: "connected" }); },
    disconnect() {}, destroy() {},
    acquirePresence() {
      acquired(); let active = true;
      return { clientId: "local", getStates: () => states,
        publish(value) { if (active) published(value); },
        subscribe(listener) { listeners.add(listener); return () => { listeners.delete(listener); }; },
        release() { if (active) { active = false; released(); } },
      };
    },
  }) });
  disposals.push(() => session.close({ mode: "discard" }));
  await session.prepare();
  const editor = createMsfeEditor({ parent: document.body.appendChild(document.createElement("div")),
    extensions: [Collaboration.configure({ session }), ...(enabled ? [CollaborationPresence.configure({ session, user: alice, onParticipants: members })] : [])] });
  disposals.push(() => editor.destroy());
  await Promise.resolve();
  return { session, editor, states, published, acquired, released, members, listeners, notify,
    controller: (editor.storage.collaborationPresence as { controller: PresenceController } | undefined)?.controller };
}

/** @param editor - Real accepted source selection. @param anchor - Directed start. @param head - Directed end. */
function select(editor: MsfeEditor, anchor: number, head = anchor): void { editor.setSelection(EditorSelection.create([EditorSelection.range(anchor, head)])); }

describe("optional mounted presence", () => {
  it("does not acquire channels for source-only consumers", async () => {
    const f = await fixture(false); expect(f.acquired).not.toHaveBeenCalled(); expect(f.listeners.size).toBe(0);
  });
  it("reports mismatched source sessions before acquiring another editor's presence channel", async () => {
    const a = await fixture(false), b = await fixture(false), errors: unknown[] = [];
    a.editor.destroy();
    const editor = createMsfeEditor({ parent: document.body.appendChild(document.createElement("div")), onError: error => errors.push(error),
      extensions: [Collaboration.configure({ session: a.session }), CollaborationPresence.configure({ session: b.session, user: alice })] });
    disposals.push(() => editor.destroy());
    expect(errors).toEqual([new Error("collaboration-presence-session-mismatch")]); expect(b.acquired).not.toHaveBeenCalled();
  });
  it("keeps primary direction, bounds broadcasts, and immediately withdraws a blurred caret", async () => {
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
    const f = await fixture(); f.controller!.focus(true); f.published.mockClear();
    const sourceReads = vi.spyOn(f.session.document.getText("source") as { toString(): string }, "toString");
    for (let head = 1; head <= 6; head++) select(f.editor, 10, head);
    expect(f.published).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(50); expect(f.published).toHaveBeenCalledTimes(1);
    const packet = f.published.mock.calls[0]![0], doc = f.session.document;
    expect(Y.createAbsolutePositionFromRelativePosition(packet.selection.anchor, doc)?.index).toBe(10);
    expect(Y.createAbsolutePositionFromRelativePosition(packet.selection.head, doc)?.index).toBe(6);
    f.controller!.focus(false); expect(f.published.mock.lastCall![0].selection).toBeNull();
    expect(f.published.mock.lastCall![0].activity).toBe("viewing"); expect(sourceReads).not.toHaveBeenCalled();
    expect(f.editor.history.canUndo).toBe(false);
  });
  it("updates geometry without rebuilding the roster or changing local selection and history", async () => {
    const f = await fixture(), text = f.session.document.getText("source");
    f.states.set("remote", encodePacket(text, bob, "editing", { anchor: 8, head: 3 })); f.notify(); await Promise.resolve();
    expect(f.editor.state.field(presenceState)[0]?.selection).toEqual({ anchor: 8, head: 3 });
    expect(f.members).toHaveBeenCalledTimes(2); // Initial empty list, then one arrival.
    const before = f.editor.state.selection;
    f.states.set("remote", encodePacket(text, bob, "editing", { anchor: 8, head: 4 })); f.notify(); await Promise.resolve();
    expect(f.members).toHaveBeenCalledTimes(2);
    expect(f.editor.state.selection).toBe(before); expect(f.editor.history.canUndo).toBe(false);
    f.editor.applyChanges({ documentId: f.editor.documentId, baseRevision: f.editor.revision, changes: { from: 0, insert: "A" } });
    await Promise.resolve(); expect(f.editor.state.field(presenceState)[0]?.selection).toEqual({ anchor: 9, head: 5 });
    expect(f.members).toHaveBeenCalledTimes(2);
  });
  it("projects remote carets without restoring a scroll snapshot over local scrolling", async () => {
    const f = await fixture(), text = f.session.document.getText("source");
    const update = vi.spyOn(f.editor, "updateViewState");
    f.states.set("remote", encodePacket(text, bob, "editing", { anchor: 2, head: 2 })); f.notify(); await Promise.resolve();
    expect(update).toHaveBeenCalledTimes(1);
    expect(update.mock.calls[0]![0]).toMatchObject({ preserveScroll: false });
  });
  it("resolves a presence endpoint only after its delayed source update is accepted", async () => {
    const f = await fixture(), remote = new Y.Doc(); Y.applyUpdate(remote, Y.encodeStateAsUpdate(f.session.document));
    const text = remote.getText("source"); text.insert(0, "future");
    f.states.set("remote", encodePacket(text, bob, "editing", { anchor: 2, head: 4 })); f.notify(); await Promise.resolve();
    expect(f.editor.state.field(presenceState)[0]?.selection).toBeNull();
    Y.applyUpdate(f.session.document, Y.encodeStateAsUpdate(remote)); await Promise.resolve();
    expect(f.editor.state.field(presenceState)[0]?.selection).toEqual({ anchor: 2, head: 4 }); remote.destroy();
  });
  it("ignores self and malformed peers, bounds the snapshot, and keeps readonly viewing positions without ranges", async () => {
    const f = await fixture(), text = f.session.document.getText("source");
    f.states.set("local", encodePacket(text, alice, "editing", { anchor: 0, head: 1 }));
    f.states.set("bad", { version: 1, user: bob, selection: { head: "bad" }, activity: "editing" });
    for (let index = 0; index < 150; index++) f.states.set(`remote-${index}`, encodePacket(text, bob, "viewing", null));
    f.notify(); await Promise.resolve();
    expect(f.editor.state.field(presenceState)).toHaveLength(98);
    expect(f.editor.state.field(presenceState).every(peer => peer.id !== "local" && peer.id !== "bad")).toBe(true);
    select(f.editor, 0, 3);
    f.editor.setMode("locked"); f.editor.setReadOnly(true); f.controller!.focus(true);
    const viewing = f.published.mock.lastCall![0];
    expect(viewing.activity).toBe("viewing");
    expect(viewing.selection).not.toBeNull();
    expect(viewing.selection!.anchor).toEqual(viewing.selection!.head);
    expect(f.editor.history.canUndo).toBe(false);
  });
  it("clears peers while disconnected, acquires a fresh lease on reconnect and cancels pending work on destroy", async () => {
    const f = await fixture(); f.states.set("remote", encodePacket(f.session.document.getText("source"), bob, "viewing", null));
    f.notify(); await Promise.resolve(); f.session.disconnect(); await Promise.resolve();
    expect(f.editor.state.field(presenceState)).toEqual([]); expect(f.released).toHaveBeenCalledTimes(1);
    await f.session.prepare(); await Promise.resolve(); expect(f.acquired).toHaveBeenCalledTimes(2);
    f.controller!.focus(true); select(f.editor, 2); f.editor.destroy(); await Promise.resolve();
    expect(f.listeners.size).toBe(0); expect(f.released).toHaveBeenCalledTimes(2);
  });
});
