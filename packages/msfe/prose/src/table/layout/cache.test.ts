import { describe, expect, it } from "vitest";
import { EditorState } from "@quirekit/cm-state";
import { markdown } from "@quirekit/cm-lang-markdown";
import { syntaxTree } from "@quirekit/cm-language";
import { GFM } from "@quirekit/lezer-markdown";
import { mapTableLayoutCache } from "./cache";
import type { TableLayoutCache } from "./types";

/** @returns A measured, mounted source table and its layout cache. */
function fixture() {
  const state = EditorState.create({ doc: "before\n\n| a | longer |\n| --- | --- |\n| x | value |\n\nafter", extensions: markdown({ extensions: [GFM] }) });
  const tree = syntaxTree(state), node = tree.topNode.getChild("Table")!;
  const value: TableLayoutCache = { from: node.from, to: node.to, doc: state.doc, tree, metrics: "font/width/padding", dirty: false,
    style: { "--msfe-table-col-0": "100px", "--msfe-table-col-1": "200px" } };
  return { state, value, cache: new Map([[String(node.from), value]]) };
}

describe("mounted table geometry ownership", () => {
  it("maps prefix edits without discarding or dirtying retained widths", () => {
    const { state, value, cache } = fixture();
    mapTableLayoutCache(cache, state.changes({ from: 2, insert: "你好\n" }));
    const mapped = cache.get(String(value.from + 3))!;
    expect(mapped.from).toBe(value.from + 3);
    expect(mapped.to).toBe(value.to + 3);
    expect(mapped.dirty).toBe(false);
    expect(mapped.style).toBe(value.style);
    expect(cache.size).toBe(1);
  });

  it("retains widths while marking changed table text for resampling", () => {
    const { state, value, cache } = fixture();
    mapTableLayoutCache(cache, state.changes({ from: state.doc.toString().indexOf("value"), insert: "long " }));
    const mapped = cache.get(String(value.from))!;
    expect(mapped.dirty).toBe(true);
    expect(mapped.to).toBe(value.to + 5);
    expect(mapped.style).toBe(value.style);
  });

  it("preserves a pending invalidation across subsequent unrelated edits", () => {
    const { state, value, cache } = fixture();
    const transaction = state.update({ changes: { from: value.from + 3, insert: "中" } });
    mapTableLayoutCache(cache, transaction.changes);
    mapTableLayoutCache(cache, transaction.state.changes({ from: 0, insert: "prefix " }));
    expect([...cache.values()][0]!.dirty).toBe(true);
    expect([...cache.values()][0]!.style).toBe(value.style);
  });

  it("drops fully deleted tables rather than assigning their widths to a different block", () => {
    const { state, value, cache } = fixture();
    mapTableLayoutCache(cache, state.changes({ from: value.from, to: value.to }));
    expect(cache.size).toBe(0);
  });

  it("handles a multi-range edit before and after a table without a false source invalidation", () => {
    const { state, value, cache } = fixture();
    const changes = state.changes([{ from: 0, to: 3, insert: "B" }, { from: state.doc.length, insert: " tail" }]);
    mapTableLayoutCache(cache, changes);
    expect([...cache.values()][0]).toMatchObject({ from: value.from - 2, to: value.to - 2, dirty: false });
    expect([...cache.values()][0]!.style).toBe(value.style);
  });

  it("keeps identity for selection-only transactions", () => {
    const { state, value, cache } = fixture();
    mapTableLayoutCache(cache, state.update({ selection: { anchor: 3 } }).changes);
    expect(cache.get(String(value.from))).toBe(value);
  });
});
