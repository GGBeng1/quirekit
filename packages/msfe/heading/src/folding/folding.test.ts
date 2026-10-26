import { describe, expect, it } from "vitest";
import { EditorSelection, EditorState } from "@quirekit/cm-state";
import { markdown } from "@quirekit/cm-lang-markdown";
import { codeFolding, ensureSyntaxTree, foldable, foldEffect, foldedRanges, unfoldEffect } from "@quirekit/cm-language";
import { headingSection } from "./query";
import { headingFoldSnapshot, headingFoldSupport } from "./state";

/** @param doc - Exact fixture source. @returns Confirmed canonical parser state. */
function fixture(doc: string): EditorState {
  const state = EditorState.create({ doc, extensions: [EditorState.allowMultipleSelections.of(true), markdown(), codeFolding(), headingFoldSnapshot.extension, headingFoldSupport] });
  expect(ensureSyntaxTree(state, doc.length, 5000)).not.toBeNull();
  return state.update({}).state;
}

/** @param state - Confirmed source. @param at - Heading start. @returns Native folded state. */
function collapse(state: EditorState, at = 0): EditorState {
  const range = headingSection(state, at);
  expect(range).not.toBeNull();
  return state.update({ effects: foldEffect.of(range!) }).state;
}

describe("heading sections use native folding", () => {
  it("ends at a peer or ancestor heading and includes lower headings", () => {
    const doc = "# Parent\n\nlead\n\n## Child\n\nbody\n\n# Peer\n\nend";
    const state = fixture(doc);
    expect(headingSection(state, 0)).toEqual({ from: 8, to: doc.indexOf("\n\n# Peer") });
    expect(headingSection(state, doc.indexOf("## Child"))).toEqual({ from: doc.indexOf("\n\nbody"), to: doc.indexOf("\n\n# Peer") });
  });

  it("retains every Setext title line while folding its underline and section", () => {
    const doc = "First title line\nsecond title line\n===\n\nbody\n\n# Next";
    expect(headingSection(fixture(doc), 0)).toEqual({ from: doc.indexOf("\n==="), to: doc.indexOf("\n\n# Next") });
  });

  it.each(["# Empty", "# Empty\n\n# Peer\nbody", "```md\n# Not a heading\n```", "    # Code"])("does not invent a body or parse code as a heading: %s", doc => {
    expect(headingSection(fixture(doc), doc.indexOf("#"))).toBeNull();
  });

  it("keeps headings inside their quote or list item", () => {
    for (const doc of ["> ## Quoted\n> body\n\noutside", "- ## Listed\n\n  body\n\n- outside"]) {
      const at = doc.indexOf("##"), state = fixture(doc), range = headingSection(state, at)!;
      expect(range.to).toBe(doc.indexOf("body") + 4);
      expect(foldable(state, state.doc.line(1).from, state.doc.line(1).to)).toEqual(range);
    }
  });

  it("shares nested choices with native folding and preserves source", () => {
    const doc = "# Outer\n\n## Inner\n\nbody\n\n# Next\n\nend", initial = fixture(doc);
    const child = collapse(initial, doc.indexOf("## Inner")), parent = collapse(child);
    expect(foldedRanges(parent).size).toBe(2);
    const next = parent.update({ effects: unfoldEffect.of(headingSection(parent, 0)!) }).state;
    expect(foldedRanges(next).size).toBe(1);
    expect(next.doc).toBe(initial.doc);
  });

  it("maps folds for unrelated text edits and opens stale section boundaries", () => {
    const doc = "lead\n\n# One\n\nbody\n\n# Two\n\ntail";
    const folded = collapse(fixture(doc), doc.indexOf("# One"));
    const moved = folded.update({ changes: { from: 0, insert: "X" } }).state;
    expect(foldedRanges(moved).size).toBe(1);
    expect(foldedRanges(moved).iter().from).toBe(doc.indexOf("\n\nbody") + 1);
    const changed = moved.update({ changes: { from: moved.doc.toString().indexOf("# Two") + 1, insert: "#" } }).state;
    expect(foldedRanges(changed).size).toBe(0);
  });

  it("opens a removed heading and a newly split section", () => {
    const folded = collapse(fixture("# One\n\nbody\n\nmore\n\n# Two"));
    expect(foldedRanges(folded.update({ changes: { from: 0, to: 2 } }).state).size).toBe(0);
    expect(foldedRanges(folded.update({ changes: { from: 13, insert: "# Split\n\n" } }).state).size).toBe(0);
  });

  it("reveals every explicit selection endpoint, including reverse and secondary ranges", () => {
    const folded = collapse(fixture("# One\n\nbody\n\n# Two"));
    for (const selection of [EditorSelection.single(9, 0), EditorSelection.create([EditorSelection.cursor(0), EditorSelection.cursor(9)])]) {
      expect(foldedRanges(folded.update({ selection }).state).size).toBe(0);
    }
  });

  it("keeps the projection dependency stable on unrelated caret changes and resets per document", () => {
    const state = fixture("# One\n\nbody\n\n# Two"), closed = collapse(state);
    const moved = closed.update({ selection: { anchor: 2 } }).state;
    expect(headingFoldSnapshot.read(moved)).toBe(headingFoldSnapshot.read(closed));
    expect(foldedRanges(fixture(state.doc.toString())).size).toBe(0);
  });
});
