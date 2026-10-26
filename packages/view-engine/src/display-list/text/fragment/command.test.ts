import { describe, expect, it } from "vitest";
import { cloneQuireTextFragmentWithLazyCaretStops, type QuireTextFragment } from "@quirekit/layout/text";
import { createTextFragmentCommand } from "./command";
import { createTextFragmentCommandShiftSignatureByKeyParts } from "../signature";

const fragment: QuireTextFragment = {
  id: "spaced", text: "ab", range: { from: 1, to: 3 }, font: "16px test",
  rect: { x: 10, y: 20, width: 25, height: 18 }, baseline: 34,
  lineHeight: 18, trailingSpacing: 5, caretStops: []
};

describe("layout-only spacing in paint commands", () => {
  it("keeps spacing only on the last style slice", () => {
    const base = { id: "slice", fragment, fillStyle: "#000" };
    expect(createTextFragmentCommand(base).trailingSpacing).toBe(5);
    expect(createTextFragmentCommand({ ...base, text: "a", range: { from: 1, to: 2 }, width: 10 }).trailingSpacing).toBeUndefined();
    expect(createTextFragmentCommand({ ...base, text: "b", range: { from: 2, to: 3 }, localX: 10, width: 15 }).trailingSpacing).toBe(5);
  });

  it("survives lazy pagination clones and distinguishes paint cache entries", () => {
    const clone = cloneQuireTextFragmentWithLazyCaretStops({
      source: fragment, id: "page-2", range: { from: 11, to: 13 },
      rect: { ...fragment.rect, y: 200 }, baseline: 214, caretStopRangeDelta: 10
    });
    expect(createTextFragmentCommand({ id: "clone", fragment: clone, fillStyle: "#000" }).trailingSpacing).toBe(5);
    const signature = createTextFragmentCommandShiftSignatureByKeyParts;
    expect(signature(fragment, "p", "#000")).not.toBe(signature({ ...fragment, trailingSpacing: 0 }, "p", "#000"));
  });
});
