import { afterEach, describe, expect, it } from "vitest";
import { EditorSelection, EditorState, StateEffect, StateField, Transaction } from "@quirekit/cm-state";
import { EditorView } from "@quirekit/cm-view";
import * as Y from "yjs";
import { createMsfeEditor, type MsfeEditor } from "@quirekit/msfe-core";
import { adoptCollaborationSession } from "../session/session";
import { Collaboration } from "../extension/collaboration";

const dispose: (() => void)[] = [];
afterEach(() => { dispose.splice(0).reverse().forEach(fn => fn()); document.body.replaceChildren(); });

/** @param source - Uniquely seeded content. @param readOnly - Second client's UI permission. @returns Two real editors connected through explicit binary exchange. */
function pair(source = "AB", readOnly = false) {
  const seed = new Y.Doc(); seed.getText("source").insert(0, source);
  const a = new Y.Doc(), b = new Y.Doc();
  Y.applyUpdate(a, Y.encodeStateAsUpdate(seed)); Y.applyUpdate(b, Y.encodeStateAsUpdate(seed)); seed.destroy();
  /** @param doc - Prepared replica. @param readonly - Local input permission. @returns Editor and session. */
  const mount = (doc: Y.Doc, readonly: boolean) => {
    const session = adoptCollaborationSession({ document: doc, manifest: { documentId: "test", epoch: "one", permission: "write",
      sourceFormat: { bom: false, lineEnding: "\n" } } });
    const parent = document.body.appendChild(document.createElement("div"));
    const editor = createMsfeEditor({ parent, readOnly: readonly, extensions: [Collaboration.configure({ session })] });
    dispose.push(() => { editor.destroy(); void session.close({ mode: "discard" }); doc.destroy(); });
    return { editor, session, view: EditorView.findFromDOM(editor.element)! };
  };
  const left = mount(a, false), right = mount(b, readOnly);
  return { left, right, a, b, sync() { Y.applyUpdate(b, Y.encodeStateAsUpdate(a)); Y.applyUpdate(a, Y.encodeStateAsUpdate(b)); } };
}

/** @param editor - Local editor. @param from - Source offset. @param insert - Native input text. */
function type(editor: MsfeEditor, from: number, insert: string): void {
  EditorView.findFromDOM(editor.element)!.dispatch({ changes: { from, insert }, selection: { anchor: from + insert.length }, userEvent: "input.type" });
}

describe("Yjs source collaboration through the MSFE root", () => {
  it("converges concurrent mixed Unicode changes and preserves the other author's edits on undo", () => {
    const p = pair("中文😀\nAB");
    type(p.left.editor, 2, "甲"); type(p.right.editor, 2, "乙"); p.sync();
    expect(p.left.editor.getMarkdown()).toBe(p.right.editor.getMarkdown());
    expect(p.left.editor.undo()).toBe(true); p.sync();
    expect(p.left.editor.getMarkdown()).toBe("中文乙😀\nAB");
    expect(p.right.editor.getMarkdown()).toBe("中文乙😀\nAB");
    expect(p.left.editor.redo()).toBe(true); p.sync();
    expect(p.left.editor.getMarkdown()).toContain("甲"); expect(p.left.editor.getMarkdown()).toBe(p.right.editor.getMarkdown());
  });
  it("maps insert/delete deltas, duplicates and reverse delivery without full source replacement", () => {
    const p = pair("abcdef");
    p.left.view.dispatch({ changes: [{ from: 1, to: 3, insert: "中" }, { from: 5, to: 6, insert: "文" }] });
    p.right.view.dispatch({ changes: { from: 3, insert: "!" } });
    p.sync(); p.sync();
    expect(p.left.editor.getMarkdown()).toBe(p.a.getText("source").toString());
    expect(p.right.editor.getMarkdown()).toBe(p.left.editor.getMarkdown());
  });
  it("receives into a readonly participant and reports remote, without local history", () => {
    const p = pair("AB", true), origins: string[] = [];
    p.right.editor.onChange(e => origins.push(e.origin));
    type(p.left.editor, 1, "R"); p.sync();
    expect(p.right.editor.getMarkdown()).toBe("ARB"); expect(origins).toEqual(["remote"]);
    expect(p.right.editor.history.canUndo).toBe(false);
    p.right.view.dispatch({ changes: { from: 0, insert: "bad" }, filter: false });
    expect(p.b.getText("source").toString()).toBe("ARB");
  });
  it("excludes host edits from history and keeps atomic commands apart from native input", () => {
    const p = pair(); type(p.left.editor, 1, "x");
    p.left.editor.applyChanges({ documentId: "test", baseRevision: p.left.editor.revision, changes: { from: 0, insert: "H" } });
    p.left.editor.commands.insertText("command");
    expect(p.left.editor.undo()).toBe(true); expect(p.left.editor.getMarkdown()).toBe("HAxB");
    expect(p.left.editor.undo()).toBe(true); expect(p.left.editor.getMarkdown()).toBe("HAB");
    expect(p.left.editor.undo()).toBe(false); p.sync(); expect(p.right.editor.getMarkdown()).toBe("HAB");
  });
  it("uses the same history through native beforeinput and notifications", () => {
    const p = pair(), states: boolean[] = [];
    p.left.editor.history.subscribe(state => states.push(state.canUndo));
    type(p.left.editor, 1, "x");
    p.left.view.contentDOM.dispatchEvent(new InputEvent("beforeinput", { inputType: "historyUndo", cancelable: true, bubbles: true }));
    expect(p.left.editor.getMarkdown()).toBe("AB"); expect(states).toContain(true); expect(states.at(-1)).toBe(false);
    expect(p.left.editor.history.canRedo).toBe(true);
  });
  it("keeps all directed selections attached to source identities through remote input and undo", () => {
    const p = pair("abcdef");
    p.left.editor.setSelection(EditorSelection.create([EditorSelection.range(2, 1), EditorSelection.cursor(5)], 1));
    p.left.editor.commands.insertText("X"); type(p.right.editor, 0, "R"); p.sync();
    p.left.editor.undo();
    expect(p.left.editor.state.selection.ranges.map(r => [r.anchor, r.head])).toEqual([[3, 2], [6, 6]]);
    expect(p.left.editor.state.selection.mainIndex).toBe(1);
  });
  it("preserves session content and history across detach, while rejecting a duplicate binding", () => {
    const p = pair(); type(p.left.editor, 0, "x");
    expect(() => p.left.session.acquire()).toThrow("collaboration-already-bound");
    p.left.editor.destroy();
    const parent = document.body.appendChild(document.createElement("div"));
    const again = createMsfeEditor({ parent, extensions: [Collaboration.configure({ session: p.left.session })] });
    dispose.push(() => again.destroy());
    expect(again.getMarkdown()).toBe("xAB"); expect(again.undo()).toBe(true); expect(again.getMarkdown()).toBe("AB");
  });
  it("does not write shared source for speculative can(), rejected filters or selection changes", () => {
    const p = pair(), updates: Uint8Array[] = []; p.a.on("update", update => updates.push(update));
    expect(p.left.editor.can().insertText("not-yet")).toBe(true);
    p.left.editor.setSelection(EditorSelection.single(1));
    p.left.view.dispatch({ changes: { from: 1, insert: "host" }, annotations: Transaction.addToHistory.of(false) });
    expect(updates).toHaveLength(1); expect(p.left.editor.history.canUndo).toBe(false);
    expect(p.a.getText("source").toString()).toBe("AhostB");
  });
  it("runs content filters before publication and does not reapply them to remote updates", () => {
    const p = pair();
    p.left.view.dispatch({ effects: StateEffect.appendConfig.of(EditorState.transactionFilter.of(tr => tr.docChanged ? [] : tr)) });
    type(p.left.editor, 1, "blocked"); expect(p.a.getText("source").toString()).toBe("AB");
    type(p.right.editor, 1, "accepted"); p.sync();
    expect(p.left.editor.getMarkdown()).toBe("AacceptedB");
  });
  it("maps asynchronous source intents through remote edits and invalidates replaced targets", () => {
    const p = pair("a target z"), anchor = p.left.editor.captureAnchor({ from: 2, to: 8 });
    const stale = p.left.editor.captureTarget();
    type(p.right.editor, 0, "remote "); p.sync();
    expect(anchor.getRange()).toEqual({ from: 9, to: 15 }); expect(anchor.target()).not.toBeNull();
    expect(p.left.editor.run(() => ({ changes: { from: 0, insert: "bad" } }), stale)).toEqual({ ok: false, reason: "stale-target" });
    p.right.view.dispatch({ changes: { from: 9, to: 15, insert: "target" } }); p.sync();
    expect(anchor.target()).toBeNull(); anchor.release();
  });
  it("seals a failed remote reducer and retains both the last accepted source and CRDT checkpoint", () => {
    const p = pair();
    const broken = StateField.define({ create: () => 0, update: (value, transaction) => {
      if (transaction.docChanged) throw new Error("broken-reducer"); return value;
    } });
    p.left.view.dispatch({ effects: StateEffect.appendConfig.of(broken) });
    type(p.right.editor, 0, "remote ");
    expect(() => p.sync()).toThrow("broken-reducer");
    expect(p.left.session.state.lifecycle).toBe("faulted");
    expect(p.left.editor.commands.insertText("bad")).toBe(false);
    const record = p.left.session.checkpoint(); expect(record.source).toBe("AB");
    const restored = new Y.Doc(); Y.applyUpdate(restored, record.update);
    expect(restored.getText("source").toString()).toBe("remote AB"); restored.destroy();
  });
  it("rejects shared formatting and additional roots at adoption", () => {
    const manifest = { documentId: "test", epoch: "one", permission: "write", sourceFormat: { bom: false, lineEnding: "\n" } } as const;
    for (const kind of ["attributes", "formatting", "embed", "root"] as const) {
      const doc = new Y.Doc(), text = doc.getText("source"); text.insert(0, "source");
      if (kind === "attributes") text.setAttribute("block", "value");
      if (kind === "formatting") text.format(0, 1, { bold: true });
      if (kind === "embed") text.insertEmbed(0, { value: "unsupported" });
      if (kind === "root") doc.getMap("extra").set("value", 1);
      expect(() => adoptCollaborationSession({ document: doc, manifest })).toThrow(/collaboration-source-/u); doc.destroy();
    }
  });
  it("retains history selection for a command issued by a remote-change observer", () => {
    const p = pair("abcdef");
    p.left.editor.setSelection(EditorSelection.create([EditorSelection.range(2, 1), EditorSelection.cursor(5)], 1));
    const off = p.left.editor.onChange(event => { if (event.origin === "remote") p.left.editor.commands.insertText("hook"); });
    type(p.right.editor, 0, "R"); p.sync(); off();
    expect(p.left.editor.undo()).toBe(true); expect(p.left.editor.getMarkdown()).toBe("Rabcdef");
    expect(p.left.editor.state.selection.ranges.map(range => [range.anchor, range.head])).toEqual([[3, 2], [6, 6]]);
    expect(p.left.editor.state.selection.mainIndex).toBe(1);
  });
  it("allows callback-issued undo after remote delivery without corrupting redo", () => {
    const p = pair(); type(p.left.editor, 0, "local "); p.sync();
    const off = p.left.editor.onChange(event => { if (event.origin === "remote") p.left.editor.undo(); });
    type(p.right.editor, p.right.editor.state.doc.length, " remote"); p.sync(); off();
    expect(p.left.editor.getMarkdown()).toBe("AB remote"); expect(p.left.editor.history.canRedo).toBe(true);
    expect(p.left.editor.redo()).toBe(true); expect(p.left.editor.getMarkdown()).toBe("local AB remote");
  });
});
