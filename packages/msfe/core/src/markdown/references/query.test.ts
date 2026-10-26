import { describe, expect, it } from "vitest";
import { ensureSyntaxTree, syntaxTree, syntaxTreeAvailable } from "@quirekit/cm-language";
import { createDocumentState } from "../../mount/state";
import { resolveMarkdownReference, getMarkdownReferenceWork } from "./query";

/** @param source - Canonical Markdown. @returns State with a completed parser for deterministic semantic assertions. */
function parsed(source: string) {
  const state = createDocumentState(source, []);
  ensureSyntaxTree(state, source.length, 3000);
  expect(syntaxTreeAvailable(state, source.length)).toBe(true);
  return state.update({}).state;
}

describe("shared Markdown reference semantics", () => {
  it("reuses the resolved map across ordinary edits in a document with many definitions", () => {
    const source = Array.from({ length: 1000 }, (_, index) => `paragraph ${index}\n\n[id-${index}]: /target-${index}\n\n`).join("");
    const before = parsed(source);
    expect(resolveMarkdownReference(before, "id-700")).toMatchObject({ definition: { url: "/target-700" } });
    let after = before.update({ changes: { from: source.indexOf("paragraph 500") + 4, insert: "x" } }).state;
    ensureSyntaxTree(after, after.doc.length, 3000); after = after.update({}).state;
    expect(resolveMarkdownReference(after, "id-700")).toEqual(resolveMarkdownReference(before, "id-700"));
    expect(getMarkdownReferenceWork(after).builds).toBe(0);
  });

  it("keeps retained indexes correct through repeated shadowing, fences, titles and distant label changes", () => {
    const prefix = `${"[first][unknown][id]\n\n".repeat(200)}ordinary paragraph\n\n`;
    const definitions = ['[id]: /first "one\n  two"\n[id]: /shadow\n[other]: /other',
      '[id]: /changed "title"\n[id]: /shadow\n[other]: /other',
      '[id]: /shadow\n[id]: /changed "title"\n[other]: /other',
      '```\n[id]: /shadow\n[id]: /changed\n```\n[other]: /other',
      '> [id]: /nested "new\n> title"\n\n[unknown]: /now-known',
      '[unknown]: /now-known\n\n- [id]: /list', '', '[id]: /restored'];
    let state = parsed(prefix + definitions[0]);
    for (let round = 0; round < 3; round++) for (const suffix of definitions) {
      resolveMarkdownReference(state, 'id');
      state = state.update({ changes: { from: prefix.length, to: state.doc.length, insert: suffix } }).state;
      ensureSyntaxTree(state, state.doc.length, 3000); state = state.update({}).state;
      const oracle = parsed(prefix + suffix);
      expect(syntaxTree(state).toString()).toBe(syntaxTree(oracle).toString());
      for (const label of ['id', 'unknown', 'other', 'missing']) {
        expect(resolveMarkdownReference(state, label)).toEqual(resolveMarkdownReference(oracle, label));
      }
    }
  });

  it("normalizes whitespace and Unicode case, but does not decode label spelling", () => {
    const state = parsed('[STRASSE]: /first\n[strasse]: /second\n[a&amp;b]: /entity\n[a\\*b]: /escape\n[a b]: /space');
    expect(resolveMarkdownReference(state, "Straße")).toMatchObject({ status: "resolved", definition: { url: "/first" } });
    expect(resolveMarkdownReference(state, " a\t b ")).toMatchObject({ status: "resolved", definition: { url: "/space" } });
    expect(resolveMarkdownReference(state, "a&b")).toEqual({ status: "missing" });
    expect(resolveMarkdownReference(state, "a*b")).toEqual({ status: "missing" });
    expect(resolveMarkdownReference(state, "a&amp;b")).toMatchObject({ definition: { url: "/entity" } });
    expect(resolveMarkdownReference(state, "a\\*b")).toMatchObject({ definition: { url: "/escape" } });
  });
  it("reads nested definitions and multiline quoted titles, excluding code and HTML", () => {
    const state = parsed('> [q]: <./a\\(b\\)?x=1&amp;y=2> "hello\n> world"\n\n- [list]: /nested\n\n---\n\n    [code]: /no\n\n```\n[fence]: /no\n```\n\n<div>\n[html]: /no\n</div>');
    expect(resolveMarkdownReference(state, "q")).toMatchObject({ definition: { url: "./a(b)?x=1&y=2", title: "hello\nworld" } });
    expect(resolveMarkdownReference(state, "list")).toMatchObject({ definition: { url: "/nested" } });
    for (const label of ["code", "fence", "html"]) expect(resolveMarkdownReference(state, label)).toEqual({ status: "missing" });
  });
  it("invalidates definitions through edits, insertion, removal and independent documents", () => {
    let state = parsed('[id]: /first\n[id]: /second');
    expect(resolveMarkdownReference(state, "id")).toMatchObject({ definition: { url: "/first" } });
    state = state.update({ changes: { from: 0, to: 13, insert: "" } }).state;
    expect(resolveMarkdownReference(state, "id")).toMatchObject({ definition: { url: "/second" } });
    state = state.update({ changes: { from: 0, insert: '[id]: /new "T"\n' } }).state;
    expect(resolveMarkdownReference(state, "id")).toMatchObject({ definition: { url: "/new", title: "T" } });
    expect(resolveMarkdownReference(parsed("[id]: /other"), "id")).toMatchObject({ definition: { url: "/other" } });
  });
  it("reports pending for a partial tree without forcing a synchronous whole-document parse", () => {
    const source = `${"paragraph\n\n".repeat(50000)}[far]: /target`;
    const state = createDocumentState(source, []);
    expect(syntaxTreeAvailable(state, source.length)).toBe(false);
    expect(resolveMarkdownReference(state, "far")).toEqual({ status: "pending" });
    expect(getMarkdownReferenceWork(state).builds).toBe(0);
    ensureSyntaxTree(state, source.length, 3000);
    expect(resolveMarkdownReference(state, "far")).toEqual({ status: "pending" });
    expect(resolveMarkdownReference(state.update({}).state, "far")).toMatchObject({ definition: { url: "/target" } });
  });
  it("does no work without consumers or on selection, and reuses syntax chunks after a local edit", () => {
    const source = `${Array.from({ length: 10000 }, (_, i) => `Paragraph ${i}.\n\n`).join("")}[id]: /target`;
    let state = parsed(source);
    expect(getMarkdownReferenceWork(state)).toEqual({ builds: 0, visitedNodes: 0, reusedChunks: 0, definitionsRead: 0, copiedDefinitions: 0, summaryLinks: 0, definitions: 0 });
    expect(resolveMarkdownReference(state, "id")).toMatchObject({ definition: { url: "/target" } });
    const initial = getMarkdownReferenceWork(state);
    state = state.update({ selection: { anchor: 4 } }).state;
    for (let i = 0; i < 20; i++) resolveMarkdownReference(state, "id");
    expect(getMarkdownReferenceWork(state)).toEqual(initial);
    state = state.update({ changes: { from: 12, insert: "changed" } }).state;
    ensureSyntaxTree(state, state.doc.length, 3000);
    state = state.update({}).state;
    expect(resolveMarkdownReference(state, "id")).toEqual(resolveMarkdownReference(parsed(state.doc.toString()), "id"));
    const edited = getMarkdownReferenceWork(state);
    expect(edited.reusedChunks).toBeGreaterThan(0);
    // The canonical reference pass now primes the same immutable collector before either query.
    expect(edited.visitedNodes).toBeLessThanOrEqual(initial.visitedNodes);
    expect(edited.definitionsRead).toBeLessThanOrEqual(initial.definitionsRead);
    expect(edited.builds).toBe(0);
  });
});
