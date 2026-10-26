import { describe, expect, it, vi } from "vitest";
import { tryCreateQuireBrowserTextMeasurer } from "./canvas";

describe("shared browser font metrics", () => {
  it("uses font boxes, script struts, bounded caches and explicit invalidation", () => {
    const measureText = vi.fn(() => ({ width: 24, fontBoundingBoxAscent: 14,
      fontBoundingBoxDescent: 4, actualBoundingBoxAscent: 9, actualBoundingBoxDescent: 0 }));
    const samples: string[] = [];
    const remove = vi.fn();
    const ownerDocument = {
      body: { appendChild: vi.fn() },
      createElement: (tag: string) => tag === "canvas" ? { getContext: () => ({ measureText }) } : {
        style: {}, textContent: "", remove,
        getBoundingClientRect() {
          samples.push(this.textContent);
          return { height: this.textContent === "田" ? 22 : 18 };
        }
      }
    } as unknown as Document;
    const reader = tryCreateQuireBrowserTextMeasurer({ ownerDocument, cacheSize: 2 })!;
    expect(reader.measureText("abc", "16px Test")).toEqual({ width: 24, ascent: 14, descent: 4, lineHeight: 18 });
    reader.measureText("abc", "16px Test");
    expect(measureText).toHaveBeenCalledTimes(1);
    expect(reader.measureText("中文", "16px Test").lineHeight).toBe(22);
    reader.measureText("汉字", "16px Test");
    expect(samples).toEqual(["Hg", "田"]);
    reader.measureText("abc", "16px Test");
    expect(measureText).toHaveBeenCalledTimes(4);
    reader.clear();
    reader.measureText("abc", "16px Test");
    expect(samples).toEqual(["Hg", "田", "Hg"]);
    expect(remove).toHaveBeenCalledTimes(3);
  });

  it("keeps a document's worth of distinct measurements by default", () => {
    const measureText = vi.fn((text: string) => ({ width: text.length }));
    const ownerDocument = { createElement: () => ({ getContext: () => ({ measureText }) }) } as unknown as Document;
    const reader = tryCreateQuireBrowserTextMeasurer({ ownerDocument })!;
    const texts = Array.from({ length: 5000 }, (_, index) => `text ${index}`);
    for (const text of texts) reader.measureText(text, index(text) % 2 === 0 ? "16px A" : "16px B");
    for (const text of texts) reader.measureText(text, index(text) % 2 === 0 ? "16px A" : "16px B");
    expect(measureText).toHaveBeenCalledTimes(5000);
  });

  it("does not replace unavailable host metrics with ink boxes or implicit approximations", () => {
    const ownerDocument = { createElement: () => ({ getContext: () => ({ measureText: () => ({
      width: 12, actualBoundingBoxAscent: 9
    }) }) }) } as unknown as Document;
    expect(tryCreateQuireBrowserTextMeasurer({ ownerDocument })!.measureText("a", "16px Test")).toEqual({ width: 12 });
    expect(tryCreateQuireBrowserTextMeasurer({ ownerDocument: {
      createElement: () => { throw new Error("No canvas"); }
    } as unknown as Document })).toBeUndefined();
  });
});

/** @param text - Sample text ending in its ordinal. @returns The ordinal. */
function index(text: string): number {
  return Number(text.slice(5));
}
