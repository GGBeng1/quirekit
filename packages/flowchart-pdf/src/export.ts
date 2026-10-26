import { planFlowchartPages, type FlowchartSnapshot, type FlowchartPageSettings } from "@quirekit/flowchart";
import { readPdfSvg, pdfSvgBounds } from "./svg/read";
import { expandPdfSvgImages } from "./svg/images";
import { preparePdfFonts } from "./fonts/prepare";
import { readPdfFontProvider } from "./fonts/registry";
import { encodeVectorPage } from "./backend/encode";
import { encodePhysicalPages } from "./pages/encode";
import { measurePdfLinks } from "./svg/links";
import { preparePdfDecorations } from "./svg/decorations";
import type { FlowchartPdfOptions } from "./types";

/** @param snapshot - Frozen source-bound vector content. @param settings - Existing physical page draft. @param owner - Explicit parser/measurement document and font registry. @param options - Task metadata/resources/lifetime. @returns Vector PDF bytes with embedded, selectable text and shared page resources. */
export async function encodeFlowchartPdf(snapshot: FlowchartSnapshot, settings: FlowchartPageSettings, owner: Document, options: FlowchartPdfOptions = {}): Promise<Uint8Array<ArrayBuffer>> {
  const signal = options.signal ?? new AbortController().signal; signal.throwIfAborted();
  const provider = options.fonts ?? readPdfFontProvider(owner), root = readPdfSvg(snapshot.svg, owner), bounds = pdfSvgBounds(snapshot, owner), plan = planFlowchartPages(bounds, settings);
  expandPdfSvgImages(root, owner);
  const sources = provider ? await provider(signal) : []; signal.throwIfAborted();
  if (root.querySelector("text") && !sources.length) throw new Error("应用尚未配置 PDF 字体");
  const fonts = await preparePdfFonts(root, sources, signal); signal.throwIfAborted();
  preparePdfDecorations(root);
  const normalization = Math.min(1, 14000 / bounds.width, 14000 / bounds.height), width = bounds.width * normalization, height = bounds.height * normalization;
  root.setAttribute("width", String(width)); root.setAttribute("height", String(height));
  const links = await measurePdfLinks(root, fonts, owner, signal); signal.throwIfAborted();
  const vector = await encodeVectorPage(root, fonts, width, height, signal); signal.throwIfAborted();
  return encodePhysicalPages(vector, bounds, plan, links, signal, options.title ?? "Diagram");
}
