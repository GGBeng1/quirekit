import type { MindMapRasterSnapshot, MindMapSnapshot } from "@quirekit/mind-map";
import { rasterizeMindMap } from "../raster";
/** @param width - Natural CSS width. @param height - Natural CSS height. @returns Aspect-preserving PDF page dimensions in points. */
export function mindMapPdfPage(width: number, height: number): readonly [number, number] {
  if (![width, height].every(value => Number.isFinite(value) && value > 0)) throw new RangeError("Invalid mind map page dimensions");
  const scale = Math.min(0.75, 14400 / width, 14400 / height);
  return [width * scale, height * scale];
}
/** @param raster - Frozen image of the same source. @param width - Natural CSS width. @param height - Natural CSS height.
 * @returns An actual one-page PDF image file, without rereading a mutable editor. */
export async function encodeMindMapPdf(raster: MindMapRasterSnapshot, width: number, height: number): Promise<Uint8Array> {
  const size = mindMapPdfPage(width, height), { PDFDocument } = await import("pdf-lib");
  const pdf = await PDFDocument.create(), image = await pdf.embedPng(raster.dataUrl);
  pdf.setCreator("Quire Mind"); pdf.setProducer("Quire Mind / pdf-lib");
  // The snapshot owns content and natural aspect; PDF owns only page units.
  // Bounded raster dimensions never redefine the document's original geometry.
  pdf.addPage([...size]).drawImage(image, { x: 0, y: 0, width: size[0], height: size[1] });
  return pdf.save();
}
/** @param snapshot - Exact source-bound vector capture. @param owner - Host document for browser rasterization.
 * @returns Whole-map PDF with white paper and bounded image resolution. */
export async function exportMindMapPdf(snapshot: MindMapSnapshot, owner: Document): Promise<Uint8Array> {
  mindMapPdfPage(snapshot.width, snapshot.height);
  return encodeMindMapPdf(await rasterizeMindMap(snapshot, owner, "#ffffff"), snapshot.width, snapshot.height);
}
