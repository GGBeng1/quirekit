import { describe, expect, it } from "vitest";
import { ChangeSet, Text, type ChangeSpec } from "@quirekit/cm-state";
import { TreeFragment, type Tree } from "@lezer/common";
import { GFM, parser } from "@quirekit/lezer-markdown";
import { getReferenceParseWork, ReferenceMarkdownParser } from "./references";

/** @param tree - Accepted native tree. @returns Node types and exact positions, including container markers. */
function shape(tree: Tree): unknown[] {
  const result: unknown[] = [];
  tree.iterate({ enter(node) { result.push([node.name, node.from, node.to]); } });
  return result;
}

/** @param grammar - Parser retaining native fragments. @param source - Prior text. @param tree - Prior accepted tree.
 * @param edits - One atomic source transaction. @returns Incremental source/tree, checked against a fresh parse. */
function edit(grammar: ReferenceMarkdownParser, source: string, tree: Tree, edits: ChangeSpec): { source: string; tree: Tree } {
  const changes = ChangeSet.of(edits, source.length), ranges: { fromA: number; toA: number; fromB: number; toB: number }[] = [];
  changes.iterChangedRanges((fromA, toA, fromB, toB) => ranges.push({ fromA, toA, fromB, toB }));
  const next = changes.apply(Text.of(source.split("\n"))).toString();
  const updated = grammar.parse(next, TreeFragment.applyChanges(TreeFragment.addTree(tree), ranges));
  expect(shape(updated)).toEqual(shape(new ReferenceMarkdownParser(parser.configure(GFM)).parse(next)));
  return { source: next, tree: updated };
}

describe("reference dependency invalidation", () => {
  it("rechecks only dependent paragraphs when a previously missing label appears and disappears", () => {
    const grammar = new ReferenceMarkdownParser(parser.configure(GFM));
    const body = Array.from({ length: 1000 }, (_, index) => `Paragraph ${index}: [first][missing-${index}][id-${index}].\n\n`).join("");
    const definitions = Array.from({ length: 1000 }, (_, index) => `[id-${index}]: /target-${index}\n`).join("");
    let current = { source: body + definitions, tree: grammar.parse(body + definitions) };
    expect(getReferenceParseWork(current.tree)!.checkedBlocks).toBe(1000);
    const addition = "\n[missing-500]: /new\n";
    current = edit(grammar, current.source, current.tree, { from: current.source.length, insert: addition });
    expect(getReferenceParseWork(current.tree)!.checkedBlocks).toBeLessThan(10);
    current = edit(grammar, current.source, current.tree, { from: current.source.length - addition.length, to: current.source.length });
    expect(getReferenceParseWork(current.tree)!.checkedBlocks).toBeLessThan(10);
  });

  it("does not reparse unrelated references for an unused definition", () => {
    const grammar = new ReferenceMarkdownParser(parser.configure(GFM));
    const source = `${"[text][id]\n\n".repeat(500)}[id]: /target\n\nordinary ending`;
    const updated = edit(grammar, source, grammar.parse(source), { from: source.length, insert: "\n\n[unused]: /other" });
    expect(getReferenceParseWork(updated.tree)!.checkedBlocks).toBeLessThan(5);
  });

  it("keeps absent proof conservative across parser instances and non-paragraph owners", () => {
    const grammar = new ReferenceMarkdownParser(parser.configure(GFM));
    const source = `${"[text][id]\n\n".repeat(40)}## [text][id]\n\n| a | b |\n| --- | --- |\n| [text][id] | [text][id] |\n\n[id]: /target`;
    const before = grammar.parse(source), fresh = new ReferenceMarkdownParser(parser.configure(GFM));
    const updated = edit(fresh, source, before, { from: source.length, insert: "\n[unused]: /other" });
    expect(getReferenceParseWork(updated.tree)!.dependencyReuses).toBe(0);
    expect(getReferenceParseWork(updated.tree)!.checkedBlocks).toBeGreaterThanOrEqual(43);
    const retained = edit(grammar, source, before, { from: source.length, insert: "\n[unused]: /other" });
    expect(getReferenceParseWork(retained.tree)!.dependencyReuses).toBeGreaterThan(30);
    expect(getReferenceParseWork(retained.tree)!.checkedBlocks).toBeGreaterThanOrEqual(3);
  });

  it("includes nested inline parser queries in the enclosing paragraph proof", () => {
    const base = parser.configure({ defineNodes: ["Nested"], parseInline: [{ name: "Nested", before: "Link",
      /** @param context - Native outer inline owner. @param next - Current code point. @param position - Current source offset.
       * @returns Custom inline end, or delegation to the ordinary grammar. */
      parse(context, next, position) {
        if (next !== 64 || context.char(position + 1) !== 64) return -1;
        const end = context.text.indexOf("@@", position - context.offset + 2) + context.offset;
        if (end < position + 2) return -1;
        const children = context.parser.parseInline(context.slice(position + 2, end), position + 2);
        return context.addElement(context.elt("Nested", position, end + 2, children));
      },
    }] });
    const grammar = new ReferenceMarkdownParser(base), body = "[outer][id] @@[a][missing][id]@@\n\n";
    let source = body.repeat(50) + "[id]: /target", tree = grammar.parse(source);
    for (const insert of ["\n[missing]: /new", "\n[unused]: /other"]) {
      const next = source + insert;
      tree = grammar.parse(next, TreeFragment.applyChanges(TreeFragment.addTree(tree),
        [{ fromA: source.length, toA: source.length, fromB: source.length, toB: next.length }]));
      expect(shape(tree)).toEqual(shape(new ReferenceMarkdownParser(base).parse(next)));
      expect(getReferenceParseWork(tree)!.checkedBlocks).toBe(insert.includes("missing") ? 50 : 0);
      source = next;
    }
  });

  it("keeps full parsing equivalent through ambiguous references, nested blocks and repeated definition changes", () => {
    const grammar = new ReferenceMarkdownParser(parser.configure(GFM));
    const body = ["[foo][bar][baz]", "![foo][bar][baz]", "[x][] [x] [Straße] [ a\t b ]",
      "[a\\*b] [a&amp;b] [a*b] [a&b]", "[outer [inner](url)][id] [outer [missing]][id]",
      "[multiline\nlabel] and [a\n b]", "> [foo][bar][baz]\n> continued [id]",
      "- [foo][bar][baz]\n  - [x][]", "## [foo][bar][baz]", "[foo][bar][baz]\n---",
      "| a | b |\n| --- | --- |\n| [foo][bar][baz] | [x][] |", "`[foo][bar]` \\[foo] [unfinished",
      "```\n[foo][bar][baz]\n```", "ordinary ending"].join("\n\n") + "\n\n";
    const definitions = ["[baz]: /b\n[x]: /x", "[bar]: /bar\n[id]: /id", "[foo]: /f\n[baz]: /b\n[x]: /x",
      "[STRASSE]: /unicode\n[a b]: /space\n[multiline label]: /multi",
      "[a\\*b]: /escaped\n[a&amp;b]: /entity", "[id]: /first\n[id]: /shadow", "[id]: /shadow\n[id]: /first",
      "```\n[id]: /hidden\n```", "> [id]: /nested \"one\n> two\"", ""];
    let current = { source: body, tree: grammar.parse(body) };
    for (let round = 0; round < 2; round++) for (const definition of definitions) {
      current = edit(grammar, current.source, current.tree, { from: body.length, to: current.source.length, insert: definition });
    }
  });

  it("invalidates edited contexts and follows structural changes during multi-range edits and their inverse", () => {
    const grammar = new ReferenceMarkdownParser(parser.configure(GFM));
    const source = `${"[a][missing][id]\n\n".repeat(80)}> [x][id]\n> next line\n\n~~~\n[id]: /hidden\n~~~\n\n[id]: /one`;
    let current = { source, tree: grammar.parse(source) };
    for (const edits of [
      [{ from: 1, to: 2, insert: "changed" }, { from: source.length, insert: "\n[missing]: /now" }],
      [{ from: source.indexOf("~~~"), to: source.indexOf("~~~") + 3, insert: "" }],
      [{ from: source.indexOf("> next"), to: source.indexOf("> next") + 2, insert: "" }],
      [{ from: 14, to: 16, insert: "" }],
    ]) {
      const before = current.source, changes = ChangeSet.of(edits, before.length);
      current = edit(grammar, before, current.tree, edits);
      current = edit(grammar, current.source, current.tree, changes.invert(Text.of(before.split("\n"))));
      expect(current.source).toBe(source);
    }
  });
});
