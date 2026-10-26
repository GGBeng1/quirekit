import { describe, expect, it } from "vitest";
import {
  createQuireRepeatedHeaderTablePartId,
  createQuireRepeatedHeaderTablePartSuffix,
  createQuireSplitTablePartId,
  createQuireSplitTablePartSuffix,
  resolveQuireTablePartChildSuffix,
  resolveQuireTablePartSourceId
} from "./part-ids";

describe("table page-local part ids", () => {
  it("keeps source ids for unsplit body parts", () => {
    expect(createQuireSplitTablePartId(
      "cell-a",
      { from: 10, to: 20 },
      { from: 10, to: 20 },
      1
    )).toBe("cell-a");
  });

  it("suffixes body parts when the page only owns part of the source range", () => {
    expect(createQuireSplitTablePartId(
      "cell-a",
      { from: 10, to: 30 },
      { from: 20, to: 30 },
      2
    )).toBe("cell-a#p2");
    expect(createQuireSplitTablePartId(
      "cell-a",
      { from: 10, to: 30 },
      { from: 40, to: 50 },
      3
    )).toBe("cell-a#p3");
  });

  it("creates repeated-header part ids and suffixes", () => {
    expect(createQuireSplitTablePartSuffix(4)).toBe("#p4");
    expect(createQuireRepeatedHeaderTablePartSuffix(4)).toBe(":repeat-p4");
    expect(createQuireRepeatedHeaderTablePartId("header-cell", 4)).toBe(
      "header-cell:repeat-p4"
    );
  });

  it("resolves source ids and nested child suffixes", () => {
    expect(resolveQuireTablePartSourceId("cell-a#p2", 2)).toBe("cell-a");
    expect(resolveQuireTablePartSourceId("cell-a:repeat-p2", 2)).toBe("cell-a");
    expect(resolveQuireTablePartSourceId("cell-a#p2", 1)).toBe("cell-a#p2");
    expect(resolveQuireTablePartChildSuffix("cell-a#p2", "cell-a")).toBe("#p2");
  });
});
