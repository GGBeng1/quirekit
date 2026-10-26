import { describe, expect, it } from "vitest";
import {
  containsRtlCharacter,
  resolveBidiEmbeddingLevels,
  resolveBidiRunEmbeddingLevels,
  resolveBidiVisualOrder
} from "./bidi";

describe("containsRtlCharacter", () => {
  it("is false for Latin and CJK text", () => {
    expect(containsRtlCharacter("abc 你好 123")).toBe(false);
  });

  it("is true when a Hebrew or Arabic character is present", () => {
    expect(containsRtlCharacter("hello אבג")).toBe(true);
    expect(containsRtlCharacter("مرحبا")).toBe(true);
  });
});

describe("resolveBidiVisualOrder", () => {
  it("returns identity order for all left-to-right levels", () => {
    expect(resolveBidiVisualOrder([0, 0, 0])).toEqual([0, 1, 2]);
  });

  it("reverses a contiguous right-to-left run (L2)", () => {
    expect(resolveBidiVisualOrder([0, 0, 1, 1, 0])).toEqual([0, 1, 3, 2, 4]);
  });

  it("reverses a pure right-to-left line", () => {
    expect(resolveBidiVisualOrder([1, 1, 1])).toEqual([2, 1, 0]);
  });
});

describe("resolveBidiEmbeddingLevels", () => {
  it("assigns an odd level to right-to-left characters", () => {
    const levels = resolveBidiEmbeddingLevels("aא", "ltr");

    expect(levels && Array.from(levels)).toEqual([0, 1]);
  });

  it("returns null for empty text", () => {
    expect(resolveBidiEmbeddingLevels("", "ltr")).toBeNull();
  });
});

describe("resolveBidiRunEmbeddingLevels", () => {
  it("maps virtual run controls back onto unchanged UTF-16 source offsets", () => {
    const levels = resolveBidiRunEmbeddingLevels([
      { text: "A" },
      { text: "אב", direction: "rtl" },
      { text: "Z" }
    ], "ltr");

    expect(levels && Array.from(levels)).toEqual([0, 1, 1, 0]);
  });

  it("retains explicit RTL semantics for Latin-only source without storing controls", () => {
    const levels = resolveBidiRunEmbeddingLevels([
      { text: "abc", direction: "rtl" }
    ], "ltr");

    expect(levels).toHaveLength(3);
    expect(Array.from(levels ?? [])).toEqual([2, 2, 2]);
  });

  it("keeps the pure LTR fast path allocation-free", () => {
    expect(resolveBidiRunEmbeddingLevels([{ text: "abc" }], "ltr")).toBeNull();
  });
});
