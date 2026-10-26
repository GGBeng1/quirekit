import { expect, it } from "vitest";
import { PDFDocument, PDFName } from "pdf-lib";
import { encodeMindMapPdf, mindMapPdfPage } from "./pdf";
const dataUrl = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/l9sAAAAASUVORK5CYII=";
it("writes a real image PDF with natural aspect and a bounded page", async () => {
  for (const [width, height] of [[1200, 600], [100000, 10000]]) {
    const bytes = await encodeMindMapPdf({ source: "", dataUrl, width: 1, height: 1 }, width!, height!);
    const pdf = await PDFDocument.load(bytes); expect(pdf.getPageCount()).toBe(1);
    const page = pdf.getPage(0), size = mindMapPdfPage(width!, height!);
    expect([page.getWidth(), page.getHeight()]).toEqual(size); expect(page.getWidth() / page.getHeight()).toBeCloseTo(width! / height!, 8);
    expect(page.node.Resources()!.get(PDFName.of("XObject"))).toBeDefined(); expect(Math.max(...size)).toBeLessThanOrEqual(14400);
  }
  for (const width of [NaN, Infinity, -1, 0]) expect(() => mindMapPdfPage(width, 10)).toThrow("dimensions");
});
