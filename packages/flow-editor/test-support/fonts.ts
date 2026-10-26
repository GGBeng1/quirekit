import { createQuirePortablePdfFontSources } from "@quirekit/font-pack/pdf";
import { resolveQuirePortablePdfFontUrls } from "@quirekit/font-pack/pdf/browser";
import { loadFlowchartPdfFont, provideFlowchartPdfFonts } from "@quirekit/flowchart-pdf/fonts";

/** @param owner - Verification host document. @returns Releases the same application-owned lazy provider used by all three demos. */
export function installFlowchartPdfFonts(owner: Document): () => void {
  const urls = resolveQuirePortablePdfFontUrls();
  return provideFlowchartPdfFonts(owner, signal => createQuirePortablePdfFontSources({ loadAsset: asset => loadFlowchartPdfFont(urls[asset.id], signal) }));
}
