import { describe, expect, it, vi } from "vitest";
import type { QuireViewRenderResult } from "../../types";
import { buildDrawingPreviewCoverage } from "./preview-coverage";

const rects = [0, 1, 2].map(index => ({ x: 0, y: index * 100, width: 100, height: 100 }));
/** @param count - Speculative page count. @param chunks - Compiled page indices. @returns Minimal isolated frame. */
function result(count: number, chunks: number[]): QuireViewRenderResult {
  return { layoutSnapshot: { pages: rects.slice(0, count).map((pageRect, pageIndex) => ({ pageRect, pageIndex })) },
    pageDisplayListChunks: { chunks: chunks.map(pageIndex => ({ pageIndex })) } } as unknown as QuireViewRenderResult;
}
describe("drawing preview page coverage", () => {
  it("retains one bounded pass when pagination shrinks", () => {
    const build = vi.fn(() => result(2, [0, 1]));
    buildDrawingPreviewCoverage(rects, build, pages => pages.map((_, index) => index));
    expect(build).toHaveBeenCalledTimes(1);
  });
  it("rebuilds only the new visible window when reflow adds a buffered page", () => {
    const build = vi.fn().mockReturnValueOnce(result(3, [0, 1])).mockReturnValueOnce(result(3, [1, 2]));
    const output = buildDrawingPreviewCoverage(rects.slice(0, 2), build, () => [1, 2]);
    expect(build).toHaveBeenCalledTimes(2);
    expect(build.mock.calls[1]?.[0]).toEqual(rects.slice(1));
    expect(output.pageDisplayListChunks?.chunks.map(chunk => chunk.pageIndex)).toEqual([1, 2]);
  });
});
