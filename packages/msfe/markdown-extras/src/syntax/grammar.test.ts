import { describe, expect, it } from "vitest";
import { parser, GFM } from "@quirekit/lezer-markdown";
import { frontmatterSyntax } from "../frontmatter/syntax";
import { mathSyntax } from "../math/syntax";
import { footnoteSyntax } from "../footnotes/syntax";

const grammar = parser.configure([GFM, frontmatterSyntax, mathSyntax, footnoteSyntax]);

/** @param source - Exact source. @returns Confirmed node names for grammar assertions. */
function names(source: string): string[] {
  const result: string[] = [];
  grammar.parse(source).iterate({ enter(node) { result.push(node.name); } });
  return result;
}

describe("optional Markdown grammar", () => {
  it("isolates frontmatter from headings and thematic breaks", () => {
    expect(names("---\ntitle: Test\n---\n\n# Body")).toContain("Frontmatter");
    expect(names("body\n\n---\ntext")).not.toContain("Frontmatter");
    expect(names("+++\ntitle = 'Test'\n+++\n\nbody")).toContain("Frontmatter");
  });
  it("isolates inline math from code, escapes, whitespace and currency", () => {
    expect(names("math $x^2$ and $ y $ and $5 and $10").filter(name => name === "InlineMath")).toHaveLength(1);
    expect(names("`$x$` \\$x$\n\n```\n$x$\n```")).not.toContain("InlineMath");
    expect(names("$$\nx^2\n$$")).toContain("DisplayMath");
    expect(names("$2+2=4$ and $5$").filter(name => name === "InlineMath")).toHaveLength(2);
    expect(names("$$incomplete$ and $$single line$$")).not.toContain("InlineMath");
  });
  it("keeps footnote references and formatted definitions in the canonical tree", () => {
    const result = names("note[^label]\n\n[^label]: **definition**\n    continuation");
    expect(result).toEqual(expect.arrayContaining(["FootnoteReference", "FootnoteDefinition", "StrongEmphasis"]));
    expect(names("`[^label]` \\[^label]")).not.toContain("FootnoteReference");
  });
  it("accepts single-line display math only as a complete container-relative block", () => {
    for (const source of ["$$E=mc^2$$", "> $$x^2$$", "- $$x^2$$"]) expect(names(source)).toContain("DisplayMath");
    for (const source of ["text $$x$$", "$$x$$ trailing", "$$ $$", "`$$x$$`", "    $$x$$", "$$x$"]) expect(names(source)).not.toContain("DisplayMath");
    const source = "> $$x + y$$", node = grammar.parse(source).topNode.getChild("Blockquote")!.getChild("DisplayMath")!;
    const body = node.getChild("DisplayMathText")!;
    expect(source.slice(body.from, body.to)).toBe("x + y");
    expect(names(String.raw`$$x\\$$`)).toContain("DisplayMath");
    expect(names(String.raw`$$x\$$`)).not.toContain("DisplayMath");
  });
  it("parses multi-block footnotes through the same grammar and ends at unindented blocks", () => {
    const source = "[^a]: first\n\n    second **bold**\n\n    - child\n\n    ```js\n    code()\n    ```\n\noutside";
    const tree = grammar.parse(source), definition = tree.topNode.getChild("FootnoteDefinition")!;
    expect(definition.getChildren("Paragraph")).toHaveLength(2);
    expect(definition.getChild("BulletList")).not.toBeNull();
    expect(definition.getChild("FencedCode")).not.toBeNull();
    expect(source.slice(definition.from, definition.to)).not.toContain("outside");
    expect(names("> [^a]: first\n>\n>     > quote\n\nend")).toContain("FootnoteDefinition");
    expect(names("- [^a]: first\n\n      - inner\n\nend").filter(name => name === "BulletList")).toHaveLength(2);
    const lazy = grammar.parse("[^a]: first\nlazy continuation\n\noutside");
    expect(lazy.topNode.getChild("FootnoteDefinition")!.getChild("Paragraph")!.to).toBe(29);
    expect(lazy.topNode.getChild("Paragraph")).not.toBeNull();
  });
});
