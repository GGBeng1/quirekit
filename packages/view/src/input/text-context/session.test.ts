// @vitest-environment happy-dom
import { createEditor } from "@quirekit/core";
import { StarterKit } from "@quirekit/starter-kit";
import { afterEach, describe, expect, it, vi } from "vitest";
import { QuireMountedInputBinding } from "../binding";
import type { QuireTextContextProvider } from "./types";

const cleanups: Array<() => void> = [];
afterEach(() => { cleanups.splice(0).reverse().forEach((cleanup) => cleanup()); });

/** @returns Real native host and canonical editor with a simple contiguous context policy. */
function setup() {
  const editor = createEditor({ extensions: [StarterKit], content: {
    type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text: "abc" }] }]
  } });
  editor.commands.setTextSelection(2);
  const input = document.createElement("textarea");
  document.body.append(input);
  let editable = true;
  const binding = new QuireMountedInputBinding({ editor, inputProxy: input, readEditable: () => editable });
  const read = vi.fn<QuireTextContextProvider["read"]>((state) => ({
    doc: state.doc, text: state.doc.firstChild!.textContent,
    anchor: state.selection.anchor - 1, head: state.selection.head - 1,
    positions: Array.from({ length: state.doc.firstChild!.textContent.length + 1 }, (_, index) => index + 1)
  }));
  const provider = { label: "Document text", read };
  binding.focus();
  cleanups.push(() => { binding.destroy(); editor.destroy(); input.remove(); });
  return { editor, input, binding, provider, read,
    /** @param value - New mounted permission. */
    setEditable(value: boolean): void { editable = value; }
  };
}

describe("mounted native text context", () => {
  it("keeps surrounding text and commits ordinary beforeinput once", () => {
    const { editor, input, binding, provider, read } = setup();
    const lease = binding.attachTextContext(provider);
    expect(input.value).toBe("abc");
    input.dispatchEvent(new InputEvent("beforeinput", { inputType: "insertText", data: "X", cancelable: true }));
    input.dispatchEvent(new InputEvent("input", { inputType: "insertText", data: "X" }));
    expect(editor.state.doc.textContent).toBe("aXbc");
    expect(input.value).toBe("aXbc");
    expect(input.selectionStart).toBe(2);
    const calls = read.mock.calls.length;
    lease.refresh();
    lease.refresh();
    expect(read).toHaveBeenCalledTimes(calls);
    expect(editor.commands.undo()).toBe(true);
    lease.refresh();
    expect(input.value).toBe("abc");
  });

  it("accepts backward native selections without keyboard events", () => {
    const { editor, input, binding, provider } = setup();
    binding.attachTextContext(provider);
    input.setSelectionRange(0, 2, "backward");
    input.dispatchEvent(new Event("select"));
    expect(editor.state.pm.selection.anchor).toBe(3);
    expect(editor.state.pm.selection.head).toBe(1);
  });

  it("maps input-only replacement and deletion without reinserting context", () => {
    const { editor, input, binding, provider } = setup();
    binding.attachTextContext(provider);
    input.value = "a你好c";
    input.dispatchEvent(new InputEvent("input", { inputType: "insertReplacementText", data: "你好" }));
    expect(editor.state.doc.textContent).toBe("a你好c");
    input.value = "ac";
    input.dispatchEvent(new InputEvent("input", { inputType: "deleteContentBackward" }));
    expect(editor.state.doc.textContent).toBe("ac");
  });

  it("commits composition once, and defers disposal until its native end", () => {
    const { editor, input, binding, provider } = setup();
    const lease = binding.attachTextContext(provider);
    input.dispatchEvent(new CompositionEvent("compositionstart"));
    input.value = "anibc";
    input.dispatchEvent(new CompositionEvent("compositionupdate", { data: "ni" }));
    lease.dispose();
    expect(lease.composing).toBe(true);
    expect(input.value).toBe("anibc");
    input.value = "a你bc";
    input.dispatchEvent(new CompositionEvent("compositionend", { data: "你" }));
    input.dispatchEvent(new InputEvent("beforeinput", { inputType: "insertFromComposition", data: "你", cancelable: true }));
    expect(editor.state.doc.textContent).toBe("a你bc");
    expect(input.getAttribute("aria-label")).toBeNull();
    expect(input.value).toBe("");
    expect(input.style.maxWidth).toBe("");
    expect(input.getAttribute("wrap")).toBeNull();
  });

  it("can re-enable a pending lease without interrupting composition", () => {
    const { editor, input, binding, provider } = setup();
    const lease = binding.attachTextContext(provider);
    input.dispatchEvent(new CompositionEvent("compositionstart"));
    lease.dispose();
    expect(binding.attachTextContext(provider)).toBe(lease);
    input.value = "a你bc";
    input.dispatchEvent(new CompositionEvent("compositionend", { data: "你" }));
    expect(editor.state.doc.textContent).toBe("a你bc");
    expect(input.value).toBe("a你bc");
  });

  it("waits to install context until an existing composition finishes", () => {
    const { editor, input, binding, provider } = setup();
    input.dispatchEvent(new CompositionEvent("compositionstart"));
    input.value = "ni";
    input.dispatchEvent(new CompositionEvent("compositionupdate", { data: "ni" }));
    binding.attachTextContext(provider);
    expect(input.value).toBe("ni");
    input.value = "你";
    input.dispatchEvent(new CompositionEvent("compositionend", { data: "你" }));
    expect(editor.state.doc.textContent).toBe("a你bc");
    expect(input.value).toBe("a你bc");
  });

  it("cancels stale preedit after an external accepted document change", () => {
    const { editor, input, binding, provider } = setup();
    const lease = binding.attachTextContext(provider);
    input.dispatchEvent(new CompositionEvent("compositionstart"));
    input.value = "anibc";
    input.dispatchEvent(new CompositionEvent("compositionupdate", { data: "ni" }));
    editor.commands.insertContent("X");
    lease.refresh();
    input.dispatchEvent(new CompositionEvent("compositionend", { data: "你" }));
    expect(editor.state.doc.textContent).toBe("aXbc");
    input.dispatchEvent(new InputEvent("beforeinput", { inputType: "insertFromComposition", data: "你", cancelable: true }));
    expect(editor.state.doc.textContent).toBe("aXbc");
    input.value = "a你bc";
    input.dispatchEvent(new InputEvent("input", { inputType: "insertText", data: "你" }));
    expect(editor.state.doc.textContent).toBe("aXbc");
    expect(input.value).toBe("aXbc");
  });

  it("blocks native replacement after permissions change and releases selection listeners", () => {
    const { editor, input, binding, provider, setEditable } = setup();
    const lease = binding.attachTextContext(provider);
    setEditable(false);
    input.value = "bad";
    input.dispatchEvent(new InputEvent("input", { inputType: "insertReplacementText" }));
    expect(editor.state.doc.textContent).toBe("abc");
    lease.dispose();
    setEditable(true);
    input.value = "abc";
    input.setSelectionRange(0, 2);
    input.dispatchEvent(new Event("select"));
    expect(editor.state.pm.selection.head).toBe(2);
  });

  it("does not commit preedit into a selection moved by another client", () => {
    const { editor, input, binding, provider } = setup();
    const lease = binding.attachTextContext(provider);
    input.dispatchEvent(new CompositionEvent("compositionstart"));
    input.value = "anibc";
    input.dispatchEvent(new CompositionEvent("compositionupdate", { data: "ni" }));
    editor.commands.setTextSelection(4);
    lease.refresh();
    input.dispatchEvent(new CompositionEvent("compositionend", { data: "你" }));
    expect(editor.state.doc.textContent).toBe("abc");
    expect(editor.state.pm.selection.head).toBe(4);
  });

  it("copies the canonical native selection and pastes through the existing clipboard pipeline", () => {
    const { editor, input, binding, provider } = setup();
    binding.attachTextContext(provider);
    input.setSelectionRange(1, 2);
    input.dispatchEvent(new Event("select"));
    const copied = new DataTransfer();
    input.dispatchEvent(new ClipboardEvent("copy", { clipboardData: copied, cancelable: true }));
    expect(copied.getData("text/plain")).toBe("b");
    const pasted = new DataTransfer();
    pasted.setData("text/plain", "替换");
    input.dispatchEvent(new ClipboardEvent("paste", { clipboardData: pasted, cancelable: true }));
    expect(editor.state.doc.textContent).toBe("a替换c");
    expect(input.value).toBe("a替换c");
  });

  it("accepts repeated IME sessions and non-cancelable replacement without duplicating context", () => {
    const { editor, input, binding, provider } = setup();
    binding.attachTextContext(provider);
    for (const text of ["你", "你"]) {
      input.dispatchEvent(new CompositionEvent("compositionstart"));
      const start = input.selectionStart;
      input.value = input.value.slice(0, start) + text + input.value.slice(start);
      input.dispatchEvent(new CompositionEvent("compositionend", { data: text }));
    }
    expect(editor.state.doc.textContent).toBe("a你你bc");
    input.dispatchEvent(new InputEvent("beforeinput", { inputType: "insertReplacementText", data: "好", cancelable: false }));
    input.value = "a好bc";
    input.dispatchEvent(new InputEvent("input", { inputType: "insertReplacementText", data: "好" }));
    expect(editor.state.doc.textContent).toBe("a好bc");
  });
});
