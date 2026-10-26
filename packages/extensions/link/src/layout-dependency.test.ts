import { afterEach, describe, expect, it } from "vitest";
import { createEditor, readQuireEditorLayoutAuthority, type QuireEditor } from "@quirekit/core";
import { Link } from "./link";

const editors: QuireEditor[] = [];
afterEach(() => {
  for (const editor of editors.splice(0)) editor.destroy();
});

describe("Link layout dependency", () => {
  it("retains configured color on selection and invalidates the same owner when color changes", () => {
    const link = Link.configure({ color: "#123456" });
    const editor = createEditor({
      extensions: [link],
      content: { type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text: "body" }] }] }
    });
    editors.push(editor);
    const first = readQuireEditorLayoutAuthority(editor, editor.state);
    editor.commands.setTextSelection(3);
    const second = readQuireEditorLayoutAuthority(editor, editor.state);
    expect(first.known && second.known).toBe(true);
    if (!first.known || !second.known) return;
    expect(second.tokens.every((value, index) => Object.is(value, first.tokens[index]))).toBe(true);
    (link.options as { color: string }).color = "#abcdef";
    const changed = readQuireEditorLayoutAuthority(editor, editor.state);
    expect(changed.known).toBe(true);
    if (!changed.known) return;
    expect(changed.tokens.some((value, index) => !Object.is(value, second.tokens[index]))).toBe(true);
    expect(link.canvasStyle?.link?.(editor.schema.marks.link!.create({ href: "#body" }))?.color).toBe("#abcdef");
  });

  it("does not inherit the base proof when a consumer overrides canvasStyle", () => {
    const editor = createEditor({ extensions: [Link.extend({ canvasStyle: () => ({ color: "red" }) })] });
    editors.push(editor);
    expect(readQuireEditorLayoutAuthority(editor, editor.state).known).toBe(false);
  });
});
