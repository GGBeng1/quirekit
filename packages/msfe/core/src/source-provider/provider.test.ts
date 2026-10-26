// @vitest-environment happy-dom
import { afterEach, describe, expect, it } from "vitest";
import { EditorSelection, EditorState, StateField } from "@quirekit/cm-state";
import { EditorView } from "@quirekit/cm-view";
import { createMsfeEditor } from "../editor/create";
import { Extension } from "../authoring/definition";
import { defineState } from "../state/authoring/definition";
import { changeOrigin } from "../state/fields";
import type { MsfeEditor } from "../editor/types";
import type { MsfeSourceBinding, MsfeSourceProvider } from "./types";

const editors: MsfeEditor[] = [];
afterEach(() => { editors.splice(0).forEach(editor => editor.destroy()); document.body.replaceChildren(); });

/** @returns Controlled source provider with an observable commit and release boundary. */
function fixture() {
  let binding: MsfeSourceBinding | undefined, text = "shared", writable = true, releases = 0, commits = 0;
  const provider: MsfeSourceProvider = { acquire: () => ({
    documentId: "document", source: { text, bom: false, lineEnding: "\n" },
    get writable() { return writable; },
    history: { extensions: [], canUndo: () => false, canRedo: () => false, undo: () => false, redo: () => false },
    attach(value) { binding = value; },
    commit(transaction, apply) { if (transaction.docChanged) { text = transaction.newDoc.toString(); commits++; } apply(); },
    release() { binding = undefined; releases++; },
    fault() {},
  }) };
  const feature = Extension.create({ name: "provided", addSourceProvider: () => provider });
  return { feature, get binding() { return binding!; }, get text() { return text; }, get releases() { return releases; },
    get commits() { return commits; }, lock() { writable = false; binding?.refresh(); } };
}

/** @param options - Mounted consumer settings. @returns Editor disposed after the test. */
function mount(options: Partial<Parameters<typeof createMsfeEditor>[0]> = {}) {
  const parent = document.body.appendChild(document.createElement("div"));
  const editor = createMsfeEditor({ parent, ...options }); editors.push(editor); return editor;
}

describe("optional source authority", () => {
  it("retains local history, file format and replacement without a provider", () => {
    const editor = mount({ markdown: "\ufeffa\r\nb" });
    expect(editor.history.canUndo).toBe(false);
    editor.commands.insertText("x");
    expect(editor.history.canUndo).toBe(true);
    expect(editor.undo()).toBe(true); expect(editor.getMarkdown()).toBe("\ufeffa\r\nb");
    expect(editor.redo()).toBe(true);
    expect(editor.replaceDocument("next", "next")).toEqual({ ok: true });
    expect(editor.history.canUndo).toBe(false);
  });
  it("commits only accepted changes before host observers and rejects reset", () => {
    const source = fixture();
    const editor = mount({ extensions: [source.feature], onChange: () => expect(source.text).toBe(editor.getMarkdown()) });
    expect(editor.documentId).toBe("document");
    expect(editor.can().insertText("x")).toBe(true); expect(source.commits).toBe(0);
    editor.commands.insertText("x"); expect(source.text).toBe("xshared");
    expect(editor.replaceDocument("lost", "new")).toEqual({ ok: false, reason: "source-provider-locked" });
  });
  it("accepts a readonly remote projection without running local content filters", () => {
    const source = fixture(), origins: string[] = [];
    const editor = mount({ readOnly: true, extensions: [source.feature, { id: "filter", extensions:
      EditorState.transactionFilter.of(tr => tr.docChanged ? [] : tr) }], onChange: e => origins.push(e.origin) });
    source.binding.dispatch({ changes: { from: 0, insert: "remote " }, origin: "remote" });
    expect(editor.getMarkdown()).toBe("remote shared"); expect(origins).toEqual(["remote"]);
    expect(source.commits).toBe(0); expect(editor.commands.insertText("denied")).toBe(false);
  });
  it("protects provider permission even from raw unfiltered local dispatch and host overrides", () => {
    const source = fixture(), editor = mount({ extensions: [source.feature] });
    source.lock(); editor.setReadOnly(false);
    expect(editor.state.readOnly).toBe(true);
    const view = EditorView.findFromDOM(editor.element)!;
    view.dispatch({ changes: { from: 0, insert: "bad" }, filter: false, annotations: changeOrigin.of("remote") });
    expect(editor.getMarkdown()).toBe("shared"); expect(source.commits).toBe(0);
    const oldBinding = source.binding; editor.destroy();
    expect(() => oldBinding.dispatch({ changes: { from: 0, insert: "late" }, origin: "remote" })).toThrow("source-binding-released");
    expect(source.releases).toBe(1);
  });
  it("rejects duplicate providers, conflicting initial values and effect history before mounting", () => {
    const source = fixture(), parent = document.body.appendChild(document.createElement("div"));
    expect(() => mount({ extensions: [source.feature, source.feature.extend({ name: "second" })] })).toThrow("duplicate-source-provider");
    expect(() => createMsfeEditor({ parent, markdown: "shared", extensions: [source.feature] })).toThrow("source-provider-markdown");
    expect(() => createMsfeEditor({ parent, documentId: "other", extensions: [source.feature] })).toThrow("source-provider-document");
    const state = defineState({ key: "effects", create: () => 0, update: v => v, invert: () => [] });
    expect(() => createMsfeEditor({ parent, extensions: [source.feature, { id: "effects", states: [state] }] })).toThrow("unsupported-history-effect");
    expect(parent.children.length).toBe(0);
  });
  it("keeps remote selection-only updates outside source events", () => {
    const source = fixture(), editor = mount({ extensions: [source.feature] });
    source.binding.dispatch({ selection: EditorSelection.single(3), origin: "history" });
    expect(editor.state.selection.main.head).toBe(3); expect(editor.revision).toBe(0);
  });
  it("releases acquisition and partial DOM when state creation or binding installation fails", () => {
    const source = fixture(), parent = document.body.appendChild(document.createElement("div"));
    const broken = StateField.define({ create: () => { throw new Error("broken-state"); }, update: value => value });
    expect(() => createMsfeEditor({ parent, extensions: [source.feature, { id: "broken", extensions: broken }] })).toThrow("broken-state");
    expect(source.releases).toBe(1); expect(parent.children.length).toBe(0);
    let releases = 0;
    const provider: MsfeSourceProvider = { acquire: () => ({ documentId: "test", writable: true,
      source: { text: "", bom: false, lineEnding: "\n" },
      history: { extensions: [], canUndo: () => false, canRedo: () => false, undo: () => false, redo: () => false },
      attach() { throw new Error("broken-binding"); }, commit(_transaction, apply) { apply(); }, fault() {}, release() { releases++; },
    }) };
    expect(() => createMsfeEditor({ parent, extensions: [{ id: "broken-binding", sourceProvider: provider }] })).toThrow("broken-binding");
    expect(releases).toBe(1); expect(parent.children.length).toBe(0);
  });
});
