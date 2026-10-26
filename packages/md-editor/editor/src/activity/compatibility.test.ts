// @vitest-environment happy-dom
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { EditorView } from "@quirekit/cm-view";
import { createMsfeEditor, type MsfeEditor } from "@quirekit/msfe-core";
import { createMemoryActivityStore, createMemoryVersionStore } from "@quirekit/edit-history/memory";
import { MdActivity, getMdVersions } from "./extension";

const editors: MsfeEditor[] = [];
beforeEach(() => {
  vi.stubGlobal("crypto", { getRandomValues: globalThis.crypto.getRandomValues.bind(globalThis.crypto) });
  vi.useFakeTimers();
});
afterEach(() => {
  editors.splice(0).forEach(editor => editor.destroy());
  vi.useRealTimers(); vi.unstubAllGlobals(); document.body.replaceChildren();
});

/** @param collaborative - Whether the server owns activity writes. @returns An editor without the secure-context UUID API. */
function fixture(collaborative: boolean) {
  const store = createMemoryActivityStore(), versions = createMemoryVersionStore(), hints = vi.fn(), onError = vi.fn();
  const parent = document.body.appendChild(document.createElement("div"));
  const editor = createMsfeEditor({ parent, markdown: "original", onError,
    extensions: [MdActivity.configure({ documentId: "doc", epoch: "1", store, versions, actor: { id: "u1", trust: "local" },
      ...(collaborative ? { hints } : {}) })] });
  editors.push(editor);
  return { editor, view: EditorView.findFromDOM(editor.element)!, store, hints, onError, versions: getMdVersions(editor)! };
}

it.each([false, true])("records paste and undo without losing content or events (collaborative: %s)", async collaborative => {
  const { editor, view, store, hints, onError } = fixture(collaborative);
  view.dispatch({ changes: { from: 8, insert: " pasted" }, userEvent: "input.paste" });
  expect(editor.getMarkdown()).toBe("original pasted");
  expect(editor.undo()).toBe(true); expect(editor.getMarkdown()).toBe("original");
  await vi.runAllTimersAsync();
  const events = collaborative ? hints.mock.calls.map(([hint]) => hint) : store.snapshot("doc");
  expect(events.map(event => event.kind)).toEqual(["text.paste", "undo"]);
  expect(new Set(events.map(event => event.operationId)).size).toBe(2);
  for (const event of events) expect(event.operationId).toMatch(/^[\da-f]{8}-[\da-f]{4}-4[\da-f]{3}-[89ab][\da-f]{3}-[\da-f]{12}$/);
  expect(onError).not.toHaveBeenCalled();
});

it("flushes ordinary typing and saves a named version without the native UUID API", async () => {
  const { editor, view, store, versions, onError } = fixture(false);
  view.dispatch({ changes: { from: 8, insert: "!" }, userEvent: "input.type" });
  await vi.runAllTimersAsync();
  const version = await versions.save("before review");
  expect(version.name).toBe("before review");
  expect(store.snapshot("doc").map(event => event.kind)).toEqual(["text.edit", "version.create"]);
  expect(editor.getMarkdown()).toBe("original!"); expect(onError).not.toHaveBeenCalled();
});
