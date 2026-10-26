import { describe, expect, it } from "vitest";
import { EditorState } from "@quirekit/cm-state";
import { SearchQuery } from "@quirekit/cm-search";
import { SEARCH_MATCH_LIMIT, indexSearchMatches, readSearchMatches } from "./count";

describe("search match count", () => {
  const state = EditorState.create({ doc: "Alpha beta alpha gamma ALPHA" });

  it("counts matches and identifies the one the selection covers", () => {
    const index = indexSearchMatches(state, new SearchQuery({ search: "alpha" }));
    expect(readSearchMatches(index, 11, 16)).toEqual({ total: 3, current: 2, limited: false });
    expect(readSearchMatches(index, 12, 16)).toEqual({ total: 3, current: 0, limited: false });
    expect(readSearchMatches(index, 0, 0)).toEqual({ total: 3, current: 0, limited: false });
  });

  it("respects query flags and reports no matches for invalid queries", () => {
    expect(readSearchMatches(indexSearchMatches(state, new SearchQuery({ search: "alpha", caseSensitive: true })), 0, 0).total).toBe(1);
    expect(readSearchMatches(indexSearchMatches(state, new SearchQuery({ search: "(", regexp: true })), 0, 0).total).toBe(0);
  });

  it("reuses the index until the query or document changes", () => {
    const query = new SearchQuery({ search: "alpha" }), index = indexSearchMatches(state, query);
    expect(indexSearchMatches(state, new SearchQuery({ search: "alpha" }), index)).toBe(index);
    const edited = state.update({ changes: { from: 0, insert: "alpha " } }).state;
    expect(readSearchMatches(indexSearchMatches(edited, query, index), 0, 5).total).toBe(4);
  });

  it("stops scanning at the limit", () => {
    const large = EditorState.create({ doc: "a ".repeat(SEARCH_MATCH_LIMIT + 50) });
    expect(readSearchMatches(indexSearchMatches(large, new SearchQuery({ search: "a" })), 0, 1))
      .toEqual({ total: SEARCH_MATCH_LIMIT, current: 1, limited: true });
  });
});
