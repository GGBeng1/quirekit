// @vitest-environment happy-dom
import { afterEach, expect, it } from "vitest";
import { EditorSelection } from "@quirekit/cm-state";
import type { MsfeEditor } from "@quirekit/msfe-core";
import { createMdEditor } from "../editor";

const editors: MsfeEditor[] = [];
afterEach(() => { for (const editor of editors.splice(0)) editor.destroy(); document.body.replaceChildren(); });

it("does not skip visible markers belonging to disabled format features", () => {
  const parent = document.createElement("div"); document.body.append(parent);
  const markdown = "L **bold** *emphasis* `code` ~~gone~~ R";
  const editor = createMdEditor({ parent, markdown, extras: false,
    features: { bold: false, emphasis: false, inlineCode: false, strikethrough: false } });
  editors.push(editor);
  for (const marker of ["**bold", "*emphasis", "`code", "~~gone"]) {
    const position = markdown.indexOf(marker);
    editor.setSelection(EditorSelection.single(position));
    expect(editor.state.selection.main.head).toBe(position);
  }
  expect(editor.getMarkdown()).toBe(markdown);
});

it("accepts a public complete replacement and an empty policy list", () => {
  for (const inlineBoundaries of [[], [{ nodes: ["InlineCode"], marker: "CodeMark", behavior: "content" as const }]]) {
    const parent = document.createElement("div"); document.body.append(parent);
    const editor = createMdEditor({ parent, markdown: "L `code` R", inlineBoundaries }); editors.push(editor);
    editor.setSelection(EditorSelection.single(2));
    expect(editor.state.selection.main.head).toBe(inlineBoundaries.length ? 3 : 2);
    expect(editor.getMarkdown()).toBe("L `code` R");
  }
});
