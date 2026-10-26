import { describe, expect, it } from "vitest";
import { EditorState } from "@quirekit/cm-state";
import { parser } from "@quirekit/lezer-markdown";
import { TreeFragment } from "@lezer/common";
import { changedTreeRanges } from "./changes";
import { ReferenceMarkdownParser } from "../../markdown/parsing/references";

describe("accepted Markdown block invalidation", () => {
  it.each([1000, 10000])("bounds native reuse verification after a middle edit in %i blocks", count => {
    const grammar = new ReferenceMarkdownParser(parser);
    const doc = Array.from({ length: count }, (_, index) => `paragraph ${index}\nsecond line\nthird line\n\n`).join("");
    const before = grammar.parse(doc), start = doc.indexOf(`paragraph ${count / 2}\n`), from = start + 4;
    const transaction = EditorState.create({ doc }).update({ changes: { from, insert: "X" } });
    const after = grammar.parse(transaction.newDoc.toString(), TreeFragment.applyChanges(TreeFragment.addTree(before),
      [{ fromA: from, toA: from, fromB: from, toB: from + 1 }]));
    const work = { builds: 0, visitedChunks: 0, comparedChunks: 0, reuseChecks: 0, reuseMappings: 0 };
    expect(changedTreeRanges(before, after, transaction.changes, transaction.newDoc.length, work))
      .toEqual([{ from: start, to: doc.indexOf("\n\n", start) + 1 }]);
    expect(work.visitedChunks).toBeLessThan(150);
    expect(work.comparedChunks).toBeLessThan(200);
  });

  it.each([1000, 10000])("shares old-tree paths across %i unchanged blocks", count => {
    const doc = Array.from({ length: count }, (_, index) => `paragraph ${index}\nsecond line\nthird line\n\n`).join("");
    const before = parser.parse(doc), start = doc.indexOf(`paragraph ${count / 2}\n`), from = start + 4;
    const transaction = EditorState.create({ doc }).update({ changes: { from, insert: "X" } });
    const after = parser.parse(transaction.newDoc.toString(), TreeFragment.applyChanges(TreeFragment.addTree(before),
      [{ fromA: from, toA: from, fromB: from, toB: from + 1 }]));
    const work = { builds: 0, visitedChunks: 0, comparedChunks: 0, reuseChecks: 0, reuseMappings: 0 };
    expect(changedTreeRanges(before, after, transaction.changes, transaction.newDoc.length, work))
      .toEqual([{ from: start, to: doc.indexOf("\n\n", start) + 1 }]);
    expect(work.comparedChunks).toBeLessThan(work.visitedChunks * 2.8);
  });

  it("bounds a middle-line edit by its complete paragraph, not surrounding paragraphs", () => {
    const doc = Array.from({ length: 1000 }, (_, index) => `paragraph ${index}\nsecond line\nthird line\n\n`).join("");
    const state = EditorState.create({ doc });
    const before = parser.parse(doc);
    const start = doc.indexOf("paragraph 500"), from = doc.indexOf("second line", start) + 3;
    const transaction = state.update({ changes: { from, insert: "X" } });
    const after = parser.parse(transaction.newDoc.toString(), TreeFragment.applyChanges(TreeFragment.addTree(before), [{ fromA: from, toA: from, fromB: from, toB: from + 1 }]));
    const changed = changedTreeRanges(before, after, transaction.changes, doc.length + 1);
    expect(changed).toHaveLength(1);
    expect(changed).toEqual([{ from: start, to: doc.indexOf("\n\n", start) + 1 }]);
  });

  it("includes downstream blocks absorbed by removing a fence", () => {
    const doc = "before\n\n```\ncode\n```\n\nafter\n\nlast";
    const state = EditorState.create({ doc });
    const from = doc.lastIndexOf("```");
    const transaction = state.update({ changes: { from, to: from + 3 } });
    const changed = changedTreeRanges(parser.parse(doc), parser.parse(transaction.newDoc.toString()), transaction.changes, doc.length - 3);
    expect(changed).toContainEqual({ from: doc.indexOf("```"), to: doc.length - 3 });
  });
});
