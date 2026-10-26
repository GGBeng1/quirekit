import { describe, expect, it } from "vitest";
import { parser, GFM, Subscript, Superscript } from "@quirekit/lezer-markdown";
import type { SyntaxNode } from "@lezer/common";
import { TreeFragment } from "@lezer/common";
import { pairedMark } from "../inline/delimiters";
import { emojiSyntax } from "../emoji/syntax";
import { definitionSyntax } from "../definitions/syntax";
import { abbreviationSyntax } from "../abbreviations/syntax";
import { containerSyntax } from "../containers/syntax";
import { footnoteSyntax } from "../footnotes/syntax";

const grammar = parser.configure([GFM, Subscript, Superscript, pairedMark("InsertedText", "++"), pairedMark("Highlight", "=="),
  emojiSyntax({ definitions: {}, emoticons: true }), definitionSyntax, abbreviationSyntax, containerSyntax(["warning", "tip"]), footnoteSyntax]);

/** @param source - Literal fixture. @param kind - Canonical syntax family. @returns Matching syntax nodes without constructing another AST. */
function nodes(source: string, kind: string): SyntaxNode[] {
  const result: SyntaxNode[] = [];
  grammar.parse(source).iterate({ enter(reference) { if (reference.name === kind) result.push(reference.node); } });
  return result;
}

describe("common optional plugins in a single canonical parser", () => {
  it("combines nested marks, scripts and ordinary GFM without consuming escaped or incomplete input", () => {
    const source = "H~2~O, 19^th^, ~~deleted~~, ++**inserted**++, ==*marked*==";
    for (const kind of ["Subscript", "Superscript", "Strikethrough", "InsertedText", "Highlight", "StrongEmphasis", "Emphasis"]) expect(nodes(source, kind)).toHaveLength(1);
    for (const kind of ["InsertedText", "Highlight", "Subscript", "Superscript"]) {
      expect(nodes(String.raw`\++x++ \==x== \~2~ \^th^`, kind)).toHaveLength(0);
      expect(nodes("`++x++ ==x== H~2~O 19^th^`\n\n```\n++x++ ==x==\n```", kind)).toHaveLength(0);
    }
    expect(nodes("++open ==open", "InsertedText")).toHaveLength(0);
    expect(nodes("===not a mark===", "Highlight")).toHaveLength(0);
  });
  it("resolves common shortcodes and emoticons, while unknown names, code and URL tokens remain literal", () => {
    expect(nodes(":smile: :fa-car: :unknown_emoji: :-) :-( 8-) ;)", "Emoji")).toHaveLength(5);
    expect(nodes(String.raw`\:smile: ` + "`:smile:` [url](https://test/:smile:) <https://test/:smile:>", "Emoji")).toHaveLength(0);
    const configured = parser.configure(emojiSyntax({ definitions: { local: "☀" }, emoticons: false }));
    expect(configured.parse(":local: :-)").toString()).toBe("Document(Paragraph(Emoji))");
    expect(parser.configure(emojiSyntax({ definitions: {}, emoticons: true })).parse(":local:").toString()).toBe("Document(Paragraph)");
  });
  it("keeps inline notes, nested links, code brackets and named references in one delimiter/numbering grammar", () => {
    const source = "19^th^ ^[note **bold** [link](/target) `]` and \\] escaped] after[^a]\n\n[^a]: named";
    const note = nodes(source, "InlineFootnote")[0]!;
    expect(source.slice(note.from, note.to)).toBe("^[note **bold** [link](/target) `]` and \\] escaped]");
    expect(note.getChild("Link")).not.toBeNull(); expect(note.getChild("StrongEmphasis")).not.toBeNull();
    expect(nodes(source, "Superscript")).toHaveLength(1);
    expect(nodes(String.raw`\^[escaped] ^[unclosed`, "InlineFootnote")).toHaveLength(0);
  });
  it("owns consecutive terms and definitions, lazy text and multi-block descriptions without swallowing the next paragraph", () => {
    const source = "Term 1\n: first\nlazy continuation\n\n    second **paragraph**\n\n    - child\n\n    ```js\n    code()\n    ```\n\nTerm 2\n~ next\n~ another\n\noutside";
    const list = nodes(source, "DefinitionList")[0]!;
    expect(nodes(source, "DefinitionList")).toHaveLength(1);
    expect(list.getChildren("DefinitionTerm")).toHaveLength(2);
    expect(list.getChildren("DefinitionDescription")).toHaveLength(3);
    const first = list.getChild("DefinitionDescription")!;
    expect(first.getChildren("Paragraph")).toHaveLength(2);
    expect(first.getChild("BulletList")).not.toBeNull(); expect(first.getChild("FencedCode")).not.toBeNull();
    expect(source.slice(list.from, list.to)).not.toContain("outside");
    expect(nodes(": orphan\n\n    : code", "DefinitionDescription")).toHaveLength(0);
    expect(nodes("> Term\n> : description", "DefinitionList")).toHaveLength(1);
    expect(nodes("- Term\n  : description", "DefinitionList")).toHaveLength(1);
  });
  it("retains container bodies as native blocks, with explicit registration, nested fences and incomplete-source fallback", () => {
    const source = ":::: warning\nouter\n\n::: tip\n**inner**\n:::\n\n- item\n::::\n\noutside";
    const containers = nodes(source, "CustomContainer");
    expect(containers).toHaveLength(2);
    for (const container of containers) expect(container.getChildren("ContainerMark")).toHaveLength(2);
    expect(containers[0]!.getChild("BulletList")).not.toBeNull();
    expect(source.slice(containers[0]!.from, containers[0]!.to)).not.toContain("outside");
    expect(nodes("::: custom\nbody\n:::", "CustomContainer")).toHaveLength(0);
    expect(nodes("::: warning\nbody", "CustomContainer")[0]!.getChildren("ContainerMark")).toHaveLength(1);
    expect(nodes("> ::: warning\n> quoted\n> :::", "CustomContainer")).toHaveLength(1);
  });
  it("accepts one blank line before a definition, retaining outer quote/list context and ordinary paragraph boundaries", () => {
    for (const source of ["Term\n\n: definition", "> Term\n>\n> : definition", "- Term\n\n  : definition"]) {
      const list = nodes(source, "DefinitionList")[0]!;
      expect(list, grammar.parse(source).toString()).toBeDefined();
      expect(list.getChild("DefinitionTerm")).not.toBeNull();
      expect(list.getChild("DefinitionDescription")).not.toBeNull();
    }
    for (const source of ["Term\n\n\n: literal", "paragraph\nsecond line\n\n: literal", "Term\n\nnext paragraph"]) {
      expect(nodes(source, "DefinitionList")).toHaveLength(0);
    }
  });
  it("reparses blank-separated definition boundaries consistently after edits and incremental reuse", () => {
    const before = "before\n\nTerm\n\n: definition\n\nTerm 2\n~ second\n\nafter", tree = grammar.parse(before);
    for (const [from, to, insert] of [[before.indexOf("Term"), before.indexOf("Term"), "new\n"],
      [before.indexOf(": definition"), before.indexOf(": definition") + 1, "text"],
      [before.indexOf("Term") + 5, before.indexOf("Term") + 5, "\n"]] as const) {
      const after = before.slice(0, from) + insert + before.slice(to);
      const fragments = TreeFragment.applyChanges(TreeFragment.addTree(tree), [{ fromA: from, toA: to, fromB: from, toB: from + insert.length }]);
      expect(grammar.parse(after, fragments).toString()).toBe(grammar.parse(after).toString());
    }
  });
  it("recognizes literal abbreviation definitions with escaped labels and trimmed titles", () => {
    const source = "*[HTML]: Hyper Text Markup Language  \n*[a\\]b]: Bracket\n\nHTML a]b";
    const definitions = nodes(source, "AbbreviationDefinition");
    expect(definitions).toHaveLength(2);
    const title = definitions[0]!.getChild("AbbreviationTitle")!;
    expect(source.slice(title.from, title.to)).toBe("Hyper Text Markup Language");
    expect(nodes("`*[HTML]: code`\n\n    *[HTML]: code", "AbbreviationDefinition")).toHaveLength(0);
  });
});
