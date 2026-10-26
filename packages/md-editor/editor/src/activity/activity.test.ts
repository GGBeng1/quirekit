// @vitest-environment happy-dom
import { afterEach, describe, expect, it, vi } from "vitest";
import { EditorView } from "@quirekit/cm-view";
import { EditorSelection } from "@quirekit/cm-state";
import { insertSourceBlock, sourceBlockAt, withSourceOperation, type MsfeEditor } from "@quirekit/msfe-core";
import { createMemoryActivityStore } from "@quirekit/edit-history/memory";
import { createMdEditor } from "../editor";
import { MdActivity } from "./extension";
import { locateActivity } from "../vue/activity/locate";
import { describeActivity } from "../vue/activity/describe";

const editors: MsfeEditor[] = [];
afterEach(() => { vi.useRealTimers(); editors.splice(0).forEach(editor => editor.destroy()); document.body.replaceChildren(); });

/** @param markdown - Initial source. @returns Editor recording into a fresh memory store. */
function fixture(markdown: string) {
  vi.useFakeTimers();
  const store = createMemoryActivityStore(), parent = document.createElement("div"); document.body.append(parent);
  const editor = createMdEditor({ parent, markdown, extensions: [MdActivity.configure({ store, documentId: "doc", epoch: "1",
    actor: { id: "u1", name: "王一帅", trust: "local" }, sessionId: "s1" })] });
  editors.push(editor);
  const view = EditorView.findFromDOM(editor.element)!;
  /** @param from - Position. @param insert - Text. @param userEvent - Input classification. */
  const type = (from: number, insert: string, userEvent = "input.type") => view.dispatch({ changes: { from, insert }, selection: EditorSelection.cursor(from + insert.length), userEvent });
  /** @returns Recorded events, oldest first, after pending writes settle. */
  const recorded = async () => { await vi.runAllTimersAsync(); return store.snapshot("doc"); };
  return { editor, view, store, type, recorded };
}

describe("activity recording", () => {
  it("merges consecutive typing in one block and splits on pauses and other blocks", async () => {
    const { type, recorded } = fixture("first\n\nsecond");
    type(5, "a"); vi.advanceTimersByTime(500); type(6, "b");
    vi.advanceTimersByTime(4000);
    type(8, "x");
    type(15, "y");
    const events = await recorded();
    expect(events.map(event => event.kind)).toEqual(["text.edit", "text.edit", "text.edit"]);
    expect(events[0]!.facts).toMatchObject({ inserted: 2, deleted: 0 });
    expect(events[0]!.content).toMatchObject({ format: "markdown", before: "first", after: "firstab", truncated: false });
    expect(events[0]!.actor).toEqual({ id: "u1", name: "王一帅", trust: "local" });
    expect(events[0]!.sessionId).toBe("s1");
  });
  it("records paste, undo and labelled product operations as separate events", async () => {
    const { editor, view, type, recorded } = fixture("first");
    type(5, "\n\n| a | b |\n| --- | --- |\n| 1 | 2 |", "input.paste");
    editor.undo();
    const block = sourceBlockAt(editor.state, 0)!;
    expect(editor.run(withSourceOperation(insertSourceBlock(block, "after", "::: highlight {emoji=📌 color=orange}\nbody\n:::"), { kind: "block.insert", facts: { type: "highlight" } }))).toEqual({ ok: true });
    view.dispatch({ selection: EditorSelection.cursor(0) });
    const events = await recorded();
    expect(events.map(event => event.kind)).toEqual(["text.paste", "undo", "block.insert"]);
    expect(events[0]!.facts.types).toEqual(["table"]);
    expect(describeActivity(events[2]!, "zh-CN")).toBe("插入高亮块");
    expect(describeActivity(events[1]!, "en")).toBe("Undid a change");
  });
  it("ignores remote and external changes but keeps local coordinates mapped", async () => {
    const { editor, type, recorded } = fixture("first\n\nsecond");
    type(13, "!");
    expect(editor.applyChanges({ documentId: editor.documentId, baseRevision: editor.revision, changes: { from: 0, insert: "remote " }, origin: "remote" }).ok).toBe(true);
    const events = await recorded();
    expect(events).toHaveLength(1);
    expect(events[0]!.target).toMatchObject({ scheme: "source-range", value: { from: 14, to: 21 } });
    expect(locateActivity(editor.state, events[0]!)).toEqual({ status: "exact", range: { from: 14, to: 21 } });
  });
  it("emits pending typing when the editor is destroyed", async () => {
    const { editor, type, store } = fixture("text");
    type(4, "!");
    editor.destroy();
    await vi.runAllTimersAsync();
    expect(store.snapshot("doc").map(event => event.content?.after)).toEqual(["text!"]);
  });
  it("sends hints for labelled operations only in collaboration mode and writes nothing locally", async () => {
    vi.useFakeTimers();
    const hints: { kind: string; delta: number; facts: object }[] = [], store = createMemoryActivityStore(), parent = document.createElement("div"); document.body.append(parent);
    const editor = createMdEditor({ parent, markdown: "first", extensions: [MdActivity.configure({ store, documentId: "doc", epoch: "1",
      actor: { id: "u1", trust: "verified" }, hints: hint => hints.push(hint) })] });
    editors.push(editor);
    const view = EditorView.findFromDOM(editor.element)!;
    view.dispatch({ changes: { from: 5, insert: "!" }, userEvent: "input.type" });
    editor.run(withSourceOperation(insertSourceBlock(sourceBlockAt(editor.state, 0)!, "after", "> quote"), { kind: "block.insert", facts: { type: "quote" } }));
    await vi.runAllTimersAsync();
    expect(hints).toEqual([expect.objectContaining({ kind: "block.insert", facts: { type: "quote" }, delta: "\n\n> quote".length })]);
    expect(store.snapshot("doc")).toEqual([]);
  });
  it("resolves other anchor schemes through the host resolver and rejects ranges outside the source", () => {
    const { editor } = fixture("hello world");
    const event = { target: { scheme: "yjs-relative", value: {} } } as Parameters<typeof locateActivity>[1];
    expect(locateActivity(editor.state, event, () => ({ from: 6, to: 11 }))).toEqual({ status: "exact", range: { from: 6, to: 11 } });
    expect(locateActivity(editor.state, event, () => ({ from: 6, to: 99 }))).toEqual({ status: "unavailable" });
    expect(locateActivity(editor.state, event)).toEqual({ status: "unavailable" });
  });
});
