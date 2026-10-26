// @vitest-environment happy-dom
import { afterEach, expect, it, vi } from "vitest";
import { EditorSelection } from "@quirekit/cm-state";
import { createMsfeEditor } from "../../editor/create";
import { sourceInputProxy } from "./extension";
import { sourceInputElement, focusSourceView } from "./focus";
import { EditorView } from "@quirekit/cm-view";
import { compositionField, compositionEffect } from "../../state/fields";
import { Extension } from "../../authoring/definition";

afterEach(() => vi.restoreAllMocks());

/** @returns One isolated editable source with a matched mobile media owner. */
async function fixture() {
  const query = Object.assign(new EventTarget(), { matches: true });
  vi.spyOn(window, "matchMedia").mockReturnValue(query as MediaQueryList);
  const parent = document.createElement("div"); document.body.append(parent);
  const editor = createMsfeEditor({ parent, mode: "live", markdown: "开始🙂结束", extensions: [
    { id: "proxy", extensions: sourceInputProxy({ mediaQuery: "all" }) },
  ] });
  await vi.waitFor(() => expect(document.querySelector("textarea[data-msfe-input]")).not.toBeNull());
  const view = EditorView.findFromDOM(editor.element)!;
  await vi.waitFor(() => expect(view.contentDOM.contentEditable).toBe("false"));
  const input = sourceInputElement(view) as HTMLTextAreaElement;
  focusSourceView(view);
  /** @param type - Browser input phase. @param init - Native payload. */
  function emit(type: string, init: InputEventInit): void { input.dispatchEvent(new InputEvent(type, { bubbles: true, cancelable: true, ...init })); }
  /** Releases the complete view lifetime and its native host. */
  function dispose(): void { editor.destroy(); parent.remove(); }
  return { editor, view, input, emit, dispose, query };
}

it("uses one input owner and commits ordinary typing/deletion/paste through source history", async () => {
  const f = await fixture();
  try {
    expect(document.activeElement).toBe(f.input);
    expect(f.view.state.facet(EditorView.editable)).toBe(false);
    f.editor.setSelection(EditorSelection.single(2, 4));
    f.emit("beforeinput", { inputType: "insertText", data: "中文" });
    expect(f.editor.getMarkdown()).toBe("开始中文结束");
    f.editor.undo(); expect(f.editor.getMarkdown()).toBe("开始🙂结束");
    f.editor.setSelection(EditorSelection.single(4));
    f.emit("beforeinput", { inputType: "deleteContentBackward" });
    expect(f.editor.getMarkdown()).toBe("开始结束");
    f.emit("beforeinput", { inputType: "insertFromPaste", data: "粘贴\n" });
    expect(f.editor.getMarkdown()).toBe("开始粘贴\n结束");
    expect(f.editor.getMarkdown()).not.toContain("\u200b");
    expect(f.input.selectionStart).toBe(f.input.selectionEnd);
  } finally { f.dispose(); }
});

it("projects preedit without source changes, commits once and cancels without deleting selection", async () => {
  const f = await fixture();
  try {
    f.editor.setSelection(EditorSelection.single(0, 2));
    const before = f.editor.revision;
    f.input.dispatchEvent(new CompositionEvent("compositionstart", { bubbles: true, data: "" }));
    f.input.value = "\u200bni";
    f.input.dispatchEvent(new CompositionEvent("compositionupdate", { bubbles: true, data: "ni" }));
    expect(f.editor.revision).toBe(before); expect(f.editor.getMarkdown()).toBe("开始🙂结束");
    expect(f.view.state.field(compositionField)).toBe(true);
    expect(f.view.contentDOM.querySelector("[data-msfe-preedit]")?.textContent).toBe("ni");
    f.input.value = "\u200b你";
    f.input.dispatchEvent(new CompositionEvent("compositionend", { bubbles: true, data: "你" }));
    expect(f.editor.getMarkdown()).toBe("你🙂结束");
    f.emit("beforeinput", { inputType: "insertText", data: "你" });
    f.emit("input", { inputType: "insertText", data: "你" });
    expect(f.editor.getMarkdown()).toBe("你🙂结束");
    expect(f.editor.revision).toBe(before + 1);
    f.editor.undo(); expect(f.editor.getMarkdown()).toBe("开始🙂结束");
    f.editor.setSelection(EditorSelection.single(0, 2));
    f.input.dispatchEvent(new CompositionEvent("compositionstart", { bubbles: true, data: "" }));
    f.input.value = "\u200b";
    f.input.dispatchEvent(new CompositionEvent("compositionend", { bubbles: true, data: "" }));
    expect(f.editor.getMarkdown()).toBe("开始🙂结束");
    expect(f.view.state.field(compositionField)).toBe(false);
  } finally { f.dispose(); }
});

it("revokes input on permission loss and releases the host on destroy", async () => {
  const f = await fixture();
  f.editor.setReadOnly(true);
  f.emit("beforeinput", { inputType: "insertText", data: "禁止" });
  expect(f.editor.getMarkdown()).toBe("开始🙂结束");
  f.dispose();
  expect(document.contains(f.input)).toBe(false);
});

it("keeps a finalized composition separate from the preceding document action", async () => {
  const f = await fixture();
  try {
    f.view.dispatch({ changes: { from: 0, insert: "先前" } });
    f.editor.setSelection(EditorSelection.single(2));
    f.input.dispatchEvent(new CompositionEvent("compositionstart", { bubbles: true }));
    f.input.value = "\u200b中文";
    f.input.dispatchEvent(new CompositionEvent("compositionend", { bubbles: true }));
    expect(f.editor.getMarkdown()).toBe("先前中文开始🙂结束");
    f.editor.undo(); expect(f.editor.getMarkdown()).toBe("先前开始🙂结束");
    f.editor.redo(); expect(f.editor.getMarkdown()).toBe("先前中文开始🙂结束");
  } finally { f.dispose(); }
});

it("defers media and mode handoff through preedit, then returns to the native source owner", async () => {
  const f = await fixture();
  try {
    f.input.dispatchEvent(new CompositionEvent("compositionstart", { bubbles: true }));
    f.editor.setMode("source");
    f.query.matches = false; f.query.dispatchEvent(new Event("change"));
    await Promise.resolve();
    expect(f.editor.mode).toBe("live"); expect(f.view.contentDOM.contentEditable).toBe("false");
    f.input.value = "\u200b"; f.input.dispatchEvent(new CompositionEvent("compositionend", { bubbles: true }));
    await vi.waitFor(() => expect(f.editor.mode).toBe("source"));
    await vi.waitFor(() => expect(f.view.contentDOM.contentEditable).toBe("true"));
    expect(sourceInputElement(f.view)).toBe(f.view.contentDOM);
    expect(f.editor.getMarkdown()).toBe("开始🙂结束");
  } finally { f.dispose(); }
});

it("keeps preedit through external changes and commits once at its mapped target", async () => {
  const f = await fixture();
  try {
    f.editor.setSelection(EditorSelection.single(2));
    f.input.dispatchEvent(new CompositionEvent("compositionstart", { bubbles: true }));
    f.input.value = "\u200bni"; f.input.dispatchEvent(new CompositionEvent("compositionupdate", { bubbles: true }));
    f.view.dispatch({ changes: { from: 0, insert: "外部" } });
    await new Promise(resolve => setTimeout(resolve));
    expect(f.view.state.field(compositionField)).toBe(true);
    expect(document.activeElement).toBe(f.input);
    expect(f.view.contentDOM.querySelector("[data-msfe-preedit]")?.textContent).toBe("ni");
    expect(f.editor.getMarkdown()).toBe("外部开始🙂结束");
    f.editor.setSelection(EditorSelection.single(0));
    f.input.value = "\u200b你"; f.input.dispatchEvent(new CompositionEvent("compositionend", { bubbles: true, data: "你" }));
    f.emit("beforeinput", { inputType: "insertText", data: "你" });
    f.emit("input", { inputType: "insertText", data: "你" });
    expect(f.editor.getMarkdown()).toBe("外部开始你🙂结束");
    expect(f.view.state.selection.main.head).toBe(5);
    expect(f.view.contentDOM.querySelector("[data-msfe-preedit]")).toBeNull();
  } finally { f.dispose(); }
});

it("retains native extension focus hooks for the independent proxy owner", async () => {
  const query = Object.assign(new EventTarget(), { matches: true });
  vi.spyOn(window, "matchMedia").mockReturnValue(query as MediaQueryList);
  const parent = document.createElement("div"), control = document.createElement("input"); document.body.append(parent, control);
  const focus = vi.fn(), blur = vi.fn();
  const editor = createMsfeEditor({ parent, mode: "live", markdown: "source", extensions: [Extension.create({
    name: "input-owner", addCodeMirrorExtensions: () => sourceInputProxy({ mediaQuery: "all" }), onFocus: focus, onBlur: blur,
  })] });
  try {
    const view = EditorView.findFromDOM(editor.element)!;
    await vi.waitFor(() => expect(view.contentDOM.contentEditable).toBe("false"));
    editor.focus(); expect(focus).toHaveBeenCalledOnce();
    control.focus(); expect(blur).toHaveBeenCalledOnce();
    editor.focus(); expect(focus).toHaveBeenCalledTimes(2);
  } finally { editor.destroy(); parent.remove(); control.remove(); }
});

it("accepts native text services that omit beforeinput data through the isolated buffer", async () => {
  const f = await fixture();
  try {
    const event = new InputEvent("beforeinput", { inputType: "insertText", data: null, bubbles: true, cancelable: true });
    f.input.dispatchEvent(event); expect(event.defaultPrevented).toBe(false);
    f.input.value = "\u200b语音";
    f.emit("input", { inputType: "insertText", data: null });
    expect(f.editor.getMarkdown()).toBe("语音开始🙂结束");
    f.editor.undo(); expect(f.editor.getMarkdown()).toBe("开始🙂结束");
  } finally { f.dispose(); }
});

it("does not refocus the native editor when an inactive proxy observes composition metadata", async () => {
  const f = await fixture();
  try {
    f.query.matches = false; f.query.dispatchEvent(new Event("change"));
    await vi.waitFor(() => expect(f.view.contentDOM.contentEditable).toBe("true"));
    const focus = vi.spyOn(f.view, "focus");
    f.view.dispatch({ effects: compositionEffect.of(true) });
    f.view.dispatch({ effects: compositionEffect.of(false) });
    await Promise.resolve(); expect(focus).not.toHaveBeenCalled();
  } finally { f.dispose(); }
});
