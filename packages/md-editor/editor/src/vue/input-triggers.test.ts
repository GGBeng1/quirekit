// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { EditorSelection } from "@quirekit/cm-state";
import { EditorView } from "@quirekit/cm-view";
import { createMsfeEditor, type MsfeEditor } from "@quirekit/msfe-core";
import { createMdMentionTrigger, createMdDocumentLinkTrigger } from "./mentions/trigger";
import { createMdSlashTrigger } from "./slash/trigger";

const editors: MsfeEditor[] = [];
beforeEach(() => {
  Object.defineProperty(document, "fonts", { configurable: true, value: Object.assign(new EventTarget(), { ready: Promise.resolve() }) });
});
afterEach(() => {
  editors.splice(0).forEach(editor => editor.destroy());
  vi.restoreAllMocks(); document.body.replaceChildren();
});

/** @param sequence - Native input opening a menu. @returns A real editor with a controlled geometry queue. */
function fixture(sequence: "@" | "[[" | "/") {
  const open = vi.fn(), onError = vi.fn();
  const slashOptions = { enabled: () => true, change: open, keydown: () => false };
  const slash = createMdSlashTrigger(slashOptions);
  const extension = sequence === "/" ? slash.extension : sequence === "@" ? createMdMentionTrigger(open) : createMdDocumentLinkTrigger(open);
  const parent = document.body.appendChild(document.createElement("div"));
  const editor = createMsfeEditor({ parent, markdown: "lead\n\n", mode: "live", extensions: [extension], onError });
  editors.push(editor);
  const view = EditorView.findFromDOM(editor.element)!;
  editor.focus(); editor.setSelection(EditorSelection.single(view.state.doc.length));
  const requests: NonNullable<Parameters<EditorView["requestMeasure"]>[0]>[] = [];
  vi.spyOn(view, "requestMeasure").mockImplementation(request => {
    if (request && (sequence === "/" ? request.key === slashOptions : request.key === undefined)) requests.push(request);
  });
  const from = view.state.doc.length;
  view.dispatch({ changes: { from, insert: sequence }, selection: EditorSelection.cursor(from + sequence.length), userEvent: "input.type" });
  // Input listeners run after view plugins; the trigger owns the last queued measurement.
  expect(requests.length).toBeGreaterThan(0);
  const request = requests.at(-1)!;
  const coordinates = vi.spyOn(view, "coordsAtPos");
  /** Runs the native read/write protocol after an intervening user action. */
  function measure(): void { const value = request.read(view); request.write?.(value, view); }
  return { editor, view, request, open, onError, coordinates, measure, dismiss: slash.dismiss };
}

describe.each(["@", "[[", "/"] as const)("deferred %s menu geometry", sequence => {
  it.each(["delete", "undo", "clear"])("retires positions before measuring after %s", action => {
    const { editor, view, open, onError, coordinates, measure } = fixture(sequence);
    if (action === "undo") expect(editor.undo()).toBe(true);
    else view.dispatch({ changes: { from: action === "clear" ? 0 : view.state.doc.length - 1, to: view.state.doc.length }, userEvent: "delete.backward" });
    const source = editor.getMarkdown();
    coordinates.mockClear();
    expect(measure).not.toThrow();
    expect(coordinates).not.toHaveBeenCalled();
    expect(open).not.toHaveBeenCalled(); expect(onError).not.toHaveBeenCalled();
    expect(editor.getMarkdown()).toBe(source);
  });

  it.each(["selection", "readonly", "replace", "destroy"])("cancels before reading when the owner changes: %s", action => {
    const { editor, open, coordinates, measure } = fixture(sequence);
    if (action === "selection") editor.setSelection(EditorSelection.single(0));
    if (action === "readonly") editor.setReadOnly(true);
    if (action === "replace") editor.replaceDocument("replacement", editor.documentId);
    if (action === "destroy") editor.destroy();
    coordinates.mockClear();
    expect(measure).not.toThrow(); expect(coordinates).not.toHaveBeenCalled(); expect(open).not.toHaveBeenCalled();
  });

  it("still opens a current query with one coordinate read", () => {
    const { editor, open, coordinates, measure } = fixture(sequence);
    coordinates.mockReturnValue({ left: 10, right: 10, top: 20, bottom: 40 });
    measure();
    expect(coordinates).toHaveBeenCalledTimes(1); expect(open).toHaveBeenCalledTimes(1);
    expect(editor.getMarkdown()).toBe("lead\n\n" + sequence);
  });

  it("rechecks the selection between reading and opening", () => {
    const { editor, view, request, open, coordinates } = fixture(sequence);
    coordinates.mockReturnValue({ left: 10, right: 10, top: 20, bottom: 40 });
    const rect = request.read(view);
    editor.setSelection(EditorSelection.single(0));
    request.write?.(rect, view);
    expect(open).not.toHaveBeenCalled();
  });
});

it("does not measure a slash menu dismissed while its source stays unchanged", () => {
  const { dismiss, coordinates, open, measure } = fixture("/");
  dismiss(); measure();
  expect(coordinates).not.toHaveBeenCalled(); expect(open).not.toHaveBeenCalled();
});
