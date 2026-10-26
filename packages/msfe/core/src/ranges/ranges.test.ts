import { describe, expect, it } from "vitest";
import { ChangeSet } from "@quirekit/cm-state";
import { SourceRangeSet, mapSourceRange } from "./set";

describe("source ranges", () => {
  it("honors insert affinity, including point ranges and changes before indexed chunks", () => {
    const set = SourceRangeSet.from([
      { id: "exclusive", from: 2, to: 5, value: 1 },
      { id: "inclusive", from: 2, to: 5, value: 2, inclusiveStart: true, inclusiveEnd: true },
      { id: "point", from: 8, to: 8, value: 3 },
    ]);
    const mapped = set.map(ChangeSet.of([{ from: 2, insert: "ab" }, { from: 5, insert: "cd" }], 10)).all();
    expect(mapped.find(range => range.id === "exclusive")).toMatchObject({ from: 4, to: 7 });
    expect(mapped.find(range => range.id === "inclusive")).toMatchObject({ from: 2, to: 9 });
    expect(mapped.find(range => range.id === "point")).toMatchObject({ from: 12, to: 12 });
  });
  it("drops full replacements even when inclusive, keeps explicit collapsed anchors and maps partial deletion", () => {
    const range = { id: "a", from: 2, to: 5, value: "annotation", inclusiveStart: true, inclusiveEnd: true };
    const change = ChangeSet.of({ from: 2, to: 5, insert: "new" }, 8);
    expect(mapSourceRange(range, change)).toBeNull();
    expect(SourceRangeSet.from([range]).map(change).all()).toEqual([]);
    expect(mapSourceRange({ ...range, onDelete: "keep" }, ChangeSet.of({ from: 1, to: 6 }, 8))).toMatchObject({ from: 1, to: 1 });
    expect(SourceRangeSet.from([range]).map(ChangeSet.of({ from: 3, to: 4 }, 8)).all()).toMatchObject([{ from: 2, to: 4 }]);
  });
  it("retains zero-width anchors on both sides of a change within the same indexed chunk", () => {
    const set = SourceRangeSet.from([2, 8, 10].map(from => ({ id: String(from), from, to: from, value: from })));
    expect(set.map(ChangeSet.of({ from: 5, insert: "abc" }, 12)).all().map(range => [range.from, range.to]))
      .toEqual([[2, 2], [11, 11], [13, 13]]);
  });
  it("matches a full mapping oracle through dispersed changes with overlapping ranges", () => {
    let set = SourceRangeSet.from(Array.from({ length: 1000 }, (_, index) => ({ id: String(index), from: index * 4, to: index * 4 + 9, value: index })));
    let expected = set.all();
    let length = 4010;
    for (let index = 0; index < 60; index++) {
      const from = index * 61 % (length - 12);
      const changes = ChangeSet.of({ from, to: from + index % 11, insert: index % 2 ? "abc" : "" }, length);
      set = set.map(changes); expected = expected.flatMap(range => { const next = mapSourceRange(range, changes); return next ? [next] : []; });
      expect([...set.all()].sort((a, b) => a.id.localeCompare(b.id))).toEqual([...expected].sort((a, b) => a.id.localeCompare(b.id)));
      length = changes.newLength;
    }
  });
});
