import { Schema, Transform } from "@quirekit/pm";
import { describe, expect, it } from "vitest";
import { getChangedRanges } from "./getChangedRanges";

const schema = new Schema({
  nodes: { doc: { content: "paragraph+" }, paragraph: { content: "text*" }, text: {} },
  marks: { strong: {}, em: {} }
});

/** @returns A transform over a short paragraph with known document positions. */
function fixture(): Transform {
  return new Transform(schema.node("doc", null, [
    schema.node("paragraph", null, [schema.text("abcdefghij")])
  ]));
}

describe("getChangedRanges value deduplication", () => {
  it("retains one dirty range when multiple marks affect the same coordinates", () => {
    const transform = fixture()
      .addMark(1, 6, schema.marks.strong!.create())
      .addMark(1, 6, schema.marks.em!.create());
    expect(getChangedRanges(transform)).toEqual([
      { oldRange: { from: 1, to: 6 }, newRange: { from: 1, to: 6 } }
    ]);
  });

  it("removes contained duplicates while preserving the containing range", () => {
    const transform = fixture()
      .addMark(1, 9, schema.marks.strong!.create())
      .addMark(2, 5, schema.marks.em!.create())
      .removeMark(2, 5, schema.marks.em!);
    expect(getChangedRanges(transform)).toEqual([
      { oldRange: { from: 1, to: 9 }, newRange: { from: 1, to: 9 } }
    ]);
  });

  it("preserves partially overlapping ranges instead of dropping either", () => {
    const transform = fixture()
      .addMark(1, 6, schema.marks.strong!.create())
      .addMark(4, 9, schema.marks.em!.create());
    expect(getChangedRanges(transform)).toEqual([
      { oldRange: { from: 1, to: 6 }, newRange: { from: 1, to: 6 } },
      { oldRange: { from: 4, to: 9 }, newRange: { from: 4, to: 9 } }
    ]);
  });

  it("keeps initial and final coordinate spaces after an insertion", () => {
    const transform = fixture()
      .insert(1, schema.text("X"))
      .addMark(2, 7, schema.marks.strong!.create())
      .addMark(2, 7, schema.marks.em!.create());
    expect(getChangedRanges(transform)).toEqual([
      { oldRange: { from: 1, to: 1 }, newRange: { from: 1, to: 2 } },
      { oldRange: { from: 1, to: 6 }, newRange: { from: 2, to: 7 } }
    ]);
  });

  it("does not manufacture changed ranges for an unchanged document", () => {
    expect(getChangedRanges(fixture())).toEqual([]);
  });
});
