// @vitest-environment happy-dom
import { afterEach, describe, expect, it, vi } from "vitest";
import { redo, undo } from "@quirekit/cm-commands";
import { EditorState } from "@quirekit/cm-state";
import { createDiagramSourceEditor } from "./controller";
import type { DiagramSourceEditor, DiagramSourceValue } from "./types";

const mounted: DiagramSourceEditor[] = [];
afterEach(() => { for (const editor of mounted.splice(0)) editor.destroy(); document.body.replaceChildren(); });

/** @param overrides - Initial workspace values. @returns One mounted controller with observed source notifications. */
function fixture(overrides: Partial<DiagramSourceValue> = {}) {
  const parent = document.createElement("div"); document.body.append(parent);
  const value: DiagramSourceValue = { source: "graph LR\n  A --> B", language: "mermaid", label: "源码", locale: "zh-CN", disabled: false, ...overrides };
  const onChange = vi.fn(), onLimit = vi.fn();
  const editor = createDiagramSourceEditor({ parent, value, onChange, onLimit }); mounted.push(editor);
  return { editor, value, onChange, onLimit };
}

describe("diagram source ownership", () => {
  it("notifies once for a text change, never for selection or controlled echo", () => {
    const { editor, value, onChange } = fixture(), dom = editor.view.dom;
    editor.view.dispatch({ selection: { anchor: 3 } });
    expect(onChange).not.toHaveBeenCalled();
    editor.view.dispatch({ changes: { from: editor.view.state.doc.length, insert: "\n  B --> C" } });
    expect(onChange).toHaveBeenCalledTimes(1);
    const state = editor.view.state;
    editor.sync({ ...value, source: onChange.mock.calls[0]![0] });
    expect(editor.view.state).toBe(state);
    expect(editor.view.dom).toBe(dom);
    expect(onChange).toHaveBeenCalledTimes(1);
  });

  it("makes template replacement undoable and restores each language's selection and history", () => {
    const { editor, value } = fixture();
    const template = "flowchart TD\n  Start --> End";
    editor.sync({ ...value, source: template });
    expect(undo(editor.view)).toBe(true);
    expect(editor.view.state.sliceDoc()).toBe(value.source);
    expect(redo(editor.view)).toBe(true);
    editor.view.dispatch({ selection: { anchor: 5 } });
    editor.sync({ ...value, source: "@startuml\nA -> B\n@enduml", language: "plantuml" });
    expect(undo(editor.view)).toBe(false);
    editor.sync({ ...value, source: template });
    expect(editor.view.state.selection.main.head).toBe(5);
    expect(undo(editor.view)).toBe(true);
    expect(editor.view.state.sliceDoc()).toBe(value.source);
  });

  it("rejects oversized edits atomically, including CRLF serialization, and clears feedback after a valid edit", () => {
    const { editor, onChange, onLimit } = fixture({ source: "a\r\n".repeat(10_000) });
    const before = editor.view.state.doc;
    editor.view.dispatch({ changes: { from: 0, insert: "x" } });
    expect(editor.view.state.doc).toBe(before);
    expect(onChange).not.toHaveBeenCalled();
    expect(onLimit).toHaveBeenLastCalledWith(true);
    editor.view.dispatch({ changes: { from: 0, to: 1 } });
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onLimit).toHaveBeenLastCalledWith(false);
  });

  it("reconfigures accessibility and read-only without echoing or resetting source", () => {
    const { editor, value, onChange } = fixture({ source: "digraph {\r\n A -> B\r\n}", language: "dot" });
    editor.sync({ ...value, disabled: true, label: "Source", locale: "en", id: "code-source" });
    expect(editor.view.state.facet(EditorState.readOnly)).toBe(true);
    expect(editor.view.contentDOM.getAttribute("aria-label")).toBe("Source");
    expect(editor.view.contentDOM.id).toBe("code-source");
    editor.view.dispatch({ changes: { from: 0, insert: "not allowed" } });
    expect(editor.view.state.sliceDoc()).toBe(value.source.replaceAll("\r\n", "\n"));
    expect(onChange).not.toHaveBeenCalled();
    editor.destroy(); editor.destroy();
    expect(document.querySelector(".cm-editor")).toBeNull();
  });

  it("accepts LF templates and pasted CRLF in a CRLF draft without flattening its lines", () => {
    const { editor, value, onChange } = fixture({ source: "graph LR\r\n  A --> B" });
    expect(onChange).not.toHaveBeenCalled();
    editor.sync({ ...value, source: "graph TD\n  X --> Y" });
    expect(editor.view.state.doc.lines).toBe(2);
    editor.view.dispatch({ changes: { from: editor.view.state.doc.length, insert: "\r\n  Y --> Z\n  Z --> X" } });
    expect(editor.view.state.doc.lines).toBe(4);
    expect(onChange).toHaveBeenLastCalledWith("graph TD\r\n  X --> Y\r\n  Y --> Z\r\n  Z --> X");
  });

  it("consumes modal Escape only inside its own source/search scope", () => {
    const { editor, onChange } = fixture();
    editor.search();
    const search = editor.view.dom.querySelector<HTMLInputElement>('input[name="search"]')!;
    const escape = new KeyboardEvent("keydown", { key: "Escape", bubbles: true, cancelable: true });
    // The modal calls this handler during capture, ahead of CodeMirror's keymap.
    /** @param event - Real capture event from the source or an outside target. */
    const handle = (event: KeyboardEvent) => editor.handleEscape(event);
    document.addEventListener("keydown", handle, true);
    try {
      search.dispatchEvent(escape);
      expect(escape.defaultPrevented).toBe(true);
      expect(editor.view.dom.querySelector('input[name="search"]')).toBeNull();
      const outside = new KeyboardEvent("keydown", { key: "Escape", bubbles: true, cancelable: true });
      document.body.dispatchEvent(outside);
      expect(outside.defaultPrevented).toBe(false);
      expect(onChange).not.toHaveBeenCalled();
    } finally { document.removeEventListener("keydown", handle, true); }
  });
});
