import { expect, it } from "vitest";
import { EditorState } from "@quirekit/cm-state";
import { markdown, markdownLanguage } from "@quirekit/cm-lang-markdown";
import { setHeading } from "./heading";

/** @param doc - Source fixture. @param text - Selected text. @returns A syntax-aware state. */
function selected(doc: string, text: string) {
  const anchor = doc.indexOf(text);
  return EditorState.create({ doc, selection: { anchor, head: anchor + text.length }, extensions: markdown({ base: markdownLanguage }) });
}
it("changes prose headings while preserving formatted text", () => {
  for (const doc of ["plain", "**bold**", "`code`", "", "# existing"]) {
    const state = selected(doc, doc), spec = setHeading(2)(state);
    expect(spec, doc).not.toBeNull();
    expect(state.update(spec!).state.doc.toString()).toBe("## " + doc.replace(/^# /u, ""));
  }
});
it("refuses tables and code blocks even through a direct command", () => {
  for (const [doc, text] of [["| A | B |\n| --- | --- |\n| one | two |", "one"], ["```\ncode\n```", "code"]]) {
    expect(setHeading(2)(selected(doc!, text!))).toBeNull();
  }
});
