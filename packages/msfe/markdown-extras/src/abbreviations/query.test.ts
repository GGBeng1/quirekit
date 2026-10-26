import { describe, expect, it } from "vitest";
import { EditorState } from "@quirekit/cm-state";
import { markdown } from "@quirekit/cm-lang-markdown";
import { ensureSyntaxTree, syntaxTree } from "@quirekit/cm-language";
import { abbreviationSyntax } from "./syntax";
import { queryAbbreviations } from "./query";
import { projectAbbreviations } from "./projection";

/** @param doc - Literal source. @returns Complete canonical test state. */
function state(doc: string): EditorState {
  const result = EditorState.create({ doc, extensions: markdown({ extensions: abbreviationSyntax }) });
  ensureSyntaxTree(result, result.doc.length, 1000); return result.update({}).state;
}

describe("source-derived abbreviation semantics", () => {
  it("uses exact longest matches and word boundaries, excluding code, escaped text, URLs and HTML", () => {
    const source = 'HTML XHTML HTML5 `HTML` \\HTML [HTML](./HTML) <span title="HTML">HTML</span>\n\n*[HTML]: Hypertext';
    const value = state(source), node = syntaxTree(value).topNode.firstChild!;
    const marks = projectAbbreviations({ state: value, node, from: 0, to: node.to });
    // The escaped H is literal text (H is not Markdown punctuation); only real escaped punctuation is excluded.
    expect(marks.map(mark => source.slice(mark.from, mark.to))).toEqual(["HTML", "HTML", "HTML", "HTML"]);
    expect(projectAbbreviations({ state: value, node, from: 0, to: 4 })).toHaveLength(1);
  });
  it("shares first-definition-wins resolution across selections and reacts to distant edits/deletions", () => {
    const source = "HTML\n\n*[HTML]: first\n*[HTML]: duplicate", before = state(source);
    const index = queryAbbreviations(before);
    expect(index.definitions.get("HTML")).toBe("first");
    expect(queryAbbreviations(before.update({ selection: { anchor: 2 } }).state)).toBe(index);
    const start = source.indexOf("first");
    const changed = before.update({ changes: { from: start, to: start + 5, insert: "changed" } }).state;
    expect(queryAbbreviations(changed).definitions.get("HTML")).toBe("changed");
    const deleted = before.update({ changes: { from: source.indexOf("*[HTML]"), to: source.indexOf("\n*[HTML]: duplicate") + 1 } }).state;
    expect(queryAbbreviations(deleted).definitions.get("HTML")).toBe("duplicate");
  });
  it("reports a pending full-document index without guessing absent definitions", () => {
    const incomplete = EditorState.create({ doc: "HTML\n\n" + "text\n\n".repeat(30000) + "*[HTML]: late", extensions: markdown({ extensions: abbreviationSyntax }) });
    expect(queryAbbreviations(incomplete).status).toBe("pending");
  });
});
