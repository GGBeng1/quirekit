import { PDFDocument, PDFName, PDFString, pushGraphicsState, popGraphicsState, rectangle, clip, endPath } from "pdf-lib";
import type { FlowchartPageBounds, FlowchartPagePlan } from "@quirekit/flowchart";
import type { PdfSvgLink } from "../svg/types";
import { pdfPagePlacement } from "./projection";

/** @param vector - Exactly one encoded vector page. @param bounds - Whole source world bounds. @param plan - Validated physical windows. @param links - Normalized link bounds. @param signal - One output lifetime. @param title - Literal metadata. @returns Physical PDF pages sharing one embedded form and its font/image resources. */
export async function encodePhysicalPages(vector: Uint8Array, bounds: FlowchartPageBounds, plan: FlowchartPagePlan, links: readonly PdfSvgLink[], signal: AbortSignal, title: string): Promise<Uint8Array<ArrayBuffer>> {
  const source = await PDFDocument.load(vector); signal.throwIfAborted();
  const output = await PDFDocument.create(), embedded = await output.embedPage(source.getPage(0)), mm = 72 / 25.4;
  output.setTitle(title); output.setCreator("QuireKit Flow Editor");
  const left = plan.settings.margins.left * mm, bottom = plan.settings.margins.bottom * mm;
  const printableWidth = (plan.paperWidth - plan.settings.margins.left - plan.settings.margins.right) * mm, printableHeight = (plan.paperHeight - plan.settings.margins.top - plan.settings.margins.bottom) * mm;
  for (const crop of plan.pages) {
    signal.throwIfAborted(); const page = output.addPage([plan.paperWidth * mm, plan.paperHeight * mm]), placement = pdfPagePlacement(bounds, plan, crop.index);
    page.pushOperators(pushGraphicsState(), rectangle(left, bottom, printableWidth, printableHeight), clip(), endPath());
    page.drawPage(embedded, placement); page.pushOperators(popGraphicsState());
    const ratio = placement.width / embedded.width;
    for (const link of links) {
      const x = Math.max(left, placement.x + link.x * ratio), y = Math.max(bottom, placement.y + link.y * ratio);
      const right = Math.min(left + printableWidth, placement.x + (link.x + link.width) * ratio), top = Math.min(bottom + printableHeight, placement.y + (link.y + link.height) * ratio);
      if (right <= x || top <= y) continue;
      const annotation = output.context.register(output.context.obj({ Type: PDFName.of("Annot"), Subtype: PDFName.of("Link"), Rect: [x, y, right, top], Border: [0, 0, 0], A: { Type: PDFName.of("Action"), S: PDFName.of("URI"), URI: PDFString.of(link.url) } }));
      page.node.addAnnot(annotation);
    }
    // Let close/source-revocation run between sheets; encoding never rereads the editor.
    await new Promise<void>(resolve => setTimeout(resolve, 0));
  }
  const result = await output.save(); signal.throwIfAborted(); if (result.byteLength > 32 * 1024 * 1024) throw new RangeError("PDF 超过输出预算");
  return Uint8Array.from(result);
}
