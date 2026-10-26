// @vitest-environment happy-dom
import { expect, it } from "vitest";
import type { EditorView } from "@quirekit/cm-view";
import { guardSourceNativeSelection } from "./selection";
import { clearSourceInput } from "./surface";
import { vi } from "vitest";

it("releases accidental source ranges after blur, leaving embedded and other-instance ranges alone", () => {
  const content = document.createElement("div"), embedded = document.createElement("div"), other = document.createElement("div");
  content.contentEditable = "false"; content.append("source text"); embedded.contentEditable = "true"; embedded.textContent = "widget text"; content.append(embedded);
  other.textContent = "another owner"; document.body.append(content, other);
  const view = { contentDOM: content, dom: content } as unknown as EditorView; let active = true;
  const cleanup = guardSourceNativeSelection(view, () => active), selection = document.getSelection()!;
  /** @param element - Explicit native text owner. */
  function select(element: HTMLElement): void { const range = document.createRange(); range.selectNodeContents(element); selection.removeAllRanges(); selection.addRange(range); document.dispatchEvent(new Event("selectionchange")); }
  try {
    select(content); expect(selection.rangeCount).toBe(0);
    select(embedded); expect(selection.toString()).toBe("widget text");
    select(other); expect(selection.toString()).toBe("another owner");
    active = false; select(content); expect(selection.rangeCount).toBe(1);
    active = true; cleanup(); select(content); expect(selection.rangeCount).toBe(1);
  } finally { cleanup(); selection.removeAllRanges(); content.remove(); other.remove(); }
});

it("never reasserts native control selection after its keyboard owner has blurred", () => {
  const input = document.createElement("textarea"); document.body.append(input);
  const selection = vi.spyOn(input, "setSelectionRange");
  try {
    clearSourceInput(input); expect(selection).not.toHaveBeenCalled();
    input.focus(); clearSourceInput(input); expect(selection).toHaveBeenCalledTimes(1);
    input.blur(); clearSourceInput(input); expect(selection).toHaveBeenCalledTimes(1);
    expect(input.value).toBe("\u200b");
  } finally { selection.mockRestore(); input.remove(); }
});
