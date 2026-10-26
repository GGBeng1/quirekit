import { expect, it } from "vitest";
import { provideFlowchartPdfFonts, readPdfFontProvider } from "./registry";

it("keeps font providers document-local and does not restore a disposed ancestor", () => {
  const doc = {} as Document, other = {} as Document, a = () => [], b = () => [];
  const stopA = provideFlowchartPdfFonts(doc, a), stopB = provideFlowchartPdfFonts(doc, b);
  expect(readPdfFontProvider(other)).toBeUndefined(); expect(readPdfFontProvider(doc)).toBe(b);
  stopA(); stopB(); expect(readPdfFontProvider(doc)).toBeUndefined(); stopB();
});
