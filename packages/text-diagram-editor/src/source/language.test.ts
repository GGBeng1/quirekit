import { describe, expect, it } from "vitest";
import { classHighlighter, highlightTree } from "@lezer/highlight";
import { ensureSyntaxTree, getIndentation } from "@quirekit/cm-language";
import { EditorState } from "@quirekit/cm-state";
import type { TextDiagramLanguage } from "@quirekit/text-diagram";
import { diagramSourceLanguages } from "./language";

/** @param language - Fixture dialect. @param source - Fixture source. @returns Highlighted spans through the public Lezer contract. */
function tokens(language: TextDiagramLanguage, source: string) {
  const state = EditorState.create({ doc: source, extensions: diagramSourceLanguages[language] });
  const result: { source: string; style: string }[] = [];
  highlightTree(ensureSyntaxTree(state, state.doc.length, 100)!, classHighlighter, (from, to, style) => {
    result.push({ source: source.slice(from, to), style });
  });
  return result;
}

describe("diagram lexical highlighting", () => {
  it("keeps Mermaid comment, keyword and compact edges distinct", () => {
    const result = tokens("mermaid", 'flowchart LR\n  A-->B["中文"]\n%% comment');
    expect(result).toEqual(expect.arrayContaining([
      { source: "flowchart", style: "tok-keyword" }, { source: "-->", style: "tok-operator" },
      { source: '"中文"', style: "tok-string" }, { source: "%% comment", style: "tok-comment" },
    ]));
  });
  for (const [language, comment] of [["plantuml", "/' block\ncomment '/"], ["dot", "/* block\ncomment */"]] as const) {
    it(`retains ${language} multiline comments and escaped quotes`, () => {
      const result = tokens(language, `${comment}\n"escaped \\" quote"`);
      expect(result.filter(token => token.style === "tok-comment").map(token => token.source).join("\n")).toContain("block\ncomment");
      expect(result.at(-1)).toEqual({ source: '"escaped \\" quote"', style: "tok-string" });
    });
  }
  it("indents bracket blocks while inheriting ordinary DSL line indentation", () => {
    const state = EditorState.create({ doc: "digraph {\n  subgraph {\n\n  }\n}", extensions: diagramSourceLanguages.dot });
    ensureSyntaxTree(state, state.doc.length, 100);
    expect(getIndentation(state, state.doc.line(3).from)).toBe(4);
    expect(getIndentation(state, state.doc.line(4).from)).toBe(2);
    expect(getIndentation(state, state.doc.line(5).from)).toBe(0);
  });
});
