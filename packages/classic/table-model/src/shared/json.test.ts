import { describe, expect, it } from "vitest";
import { equalStableJson, serializeStableJson } from "./json";

describe("Word Table stable JSON comparison", () => {
  it("normalizes recursive object key order without reordering arrays", () => {
    expect(equalStableJson(
      { nested: { right: 2, left: 1 }, values: [2, 1] },
      { values: [2, 1], nested: { left: 1, right: 2 } }
    )).toBe(true);
    expect(serializeStableJson([2, 1])).not.toBe(serializeStableJson([1, 2]));
  });
});
