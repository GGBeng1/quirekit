// @vitest-environment happy-dom
import { readFile } from "node:fs/promises";
import { inflateSync } from "node:zlib";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { PDFDocument, PDFName, PDFRawStream } from "pdf-lib";
import { defaultFlowchartPageSettings, type FlowchartSnapshot } from "@quirekit/flowchart";
import { createQuirePortablePdfFontSources } from "@quirekit/font-pack/pdf";
import { encodeFlowchartPdf } from "./export";
import { readPdfSvg } from "./svg/read";

/** @returns One licensed application font provider with complete static resources. */
function fonts() { return createQuirePortablePdfFontSources({ loadAsset: asset => readFile(resolve("../font-pack/dist/pdf/fonts", asset.fileName)) }); }
/** @param body - Admitted static markup. @param viewBox - World window. @returns A neutral immutable snapshot. */
function snapshot(body: string, viewBox = "-40 -20 1200 1200"): FlowchartSnapshot {
  return { svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}">${body}</svg>`, width: 1200, height: 900, source: "", revision: 0 };
}
/** @param pdf - Encoded document. @param formsOnly - Inspect the shared visible Form rather than retained producer resources. @returns Decoded streams, independent of object numbering/compression. */
function streams(pdf: PDFDocument, formsOnly = false): string {
  return pdf.context.enumerateIndirectObjects().flatMap(([, object]) => {
    if (!(object instanceof PDFRawStream)) return [];
    if (formsOnly && object.dict.get(PDFName.of("Subtype"))?.toString() !== "/Form") return [];
    const bytes = object.dict.get(PDFName.of("Filter"))?.toString() === "/FlateDecode" ? inflateSync(object.contents) : object.contents;
    return [new TextDecoder().decode(bytes)];
  }).join("\n");
}
describe("neutral vector PDF", () => {
  it("embeds one shared vector form across physical pages and maps Chinese text", async () => {
    const source = snapshot('<path d="M-30 -10L1100 800" stroke="#345678" fill="none"/><text x="10" y="30" font-size="24">中文 <tspan font-weight="bold">Vector</tspan></text>');
    const bytes = await encodeFlowchartPdf(source, { ...defaultFlowchartPageSettings, scale: 1 }, document, { fonts }), pdf = await PDFDocument.load(bytes);
    expect(pdf.getPageCount()).toBe(4); expect(pdf.getPage(0).getWidth()).toBeCloseTo(210 * 72 / 25.4);
    expect(streams(pdf)).toMatch(/\bm\b[\s\S]*\bl\b/); expect(streams(pdf)).toContain("4e2d");
    const forms = pdf.context.enumerateIndirectObjects().filter(([, object]) => object instanceof PDFRawStream && object.dict.get(PDFName.of("Subtype"))?.toString() === "/Form");
    expect(forms).toHaveLength(1); expect(pdf.context.enumerateIndirectObjects().some(([, object]) => object instanceof PDFRawStream && object.dict.get(PDFName.of("Subtype"))?.toString() === "/Image")).toBe(false);
  });
  it("expands static SVG icons as paths and produces a legitimate empty page", async () => {
    const icon = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M2 2L22 22" stroke="#112233"/></svg>');
    const bytes = await encodeFlowchartPdf(snapshot(`<image href="${icon}" x="0" y="0" width="120" height="120"/>`), defaultFlowchartPageSettings, document), pdf = await PDFDocument.load(bytes);
    expect(pdf.getPageCount()).toBe(1); expect(streams(pdf)).toMatch(/\bm\b[\s\S]*\bl\b/);
    expect((await PDFDocument.load(await encodeFlowchartPdf(snapshot('<text display="none">Hidden placeholder</text>', "0 0 10 10"), defaultFlowchartPageSettings, document))).getPageCount()).toBe(1);
  });
  it("paints both decorations and ends simulated italic at the next normal run", async () => {
    const source = snapshot('<text font-size="28"><tspan x="12" y="40" font-style="italic" text-decoration="underline line-through">中文</tspan><tspan x="92" y="40" font-style="normal">Normal</tspan></text>', "0 0 260 80");
    const pdf = await PDFDocument.load(await encodeFlowchartPdf(source, defaultFlowchartPageSettings, document, { fonts })), encoded = streams(pdf, true);
    const matrices = [...encoded.matchAll(/1 0 ([\d.-]+) -1 [\d.-]+ [\d.-]+ Tm/g)].map(match => Number(match[1]));
    expect(matrices.some(shear => shear > 0)).toBe(true);
    expect(matrices.slice(2).every(shear => shear === 0), JSON.stringify(matrices)).toBe(true);
    // Each Chinese glyph has two painted vector decoration strips. Font
    // outlines live in embedded resources, so they cannot satisfy this check.
    expect([...encoded.matchAll(/\bm\n[\s\S]*?\bh\nf\b/g)].length).toBe(4);
    expect(streams(pdf)).toContain("4e2d");
  });
  it("rejects missing fonts, unsupported glyphs and cancellation instead of dropping text", async () => {
    await expect(encodeFlowchartPdf(snapshot('<text x="0" y="10">中文</text>'), defaultFlowchartPageSettings, document)).rejects.toThrow("应用尚未配置 PDF 字体");
    const only = fonts().filter(face => face.id.endsWith("carlito-400-normal"));
    await expect(encodeFlowchartPdf(snapshot('<text x="0" y="10">中文</text>'), defaultFlowchartPageSettings, document, { fonts: () => only })).rejects.toThrow("U+4E2D");
    const control = new AbortController();
    await expect(encodeFlowchartPdf(snapshot('<text x="0" y="10">Text</text>'), defaultFlowchartPageSettings, document, { signal: control.signal, fonts: () => { control.abort(); return []; } })).rejects.toThrow();
  });
  it.each(['<script/>', '<foreignObject/>', '<image href="https://example.com/a.png"/>', '<path style="filter:url(#shadow)"/>'])("rejects unsupported/external content: %s", body => {
    expect(() => readPdfSvg(snapshot(body).svg, document)).toThrow();
  });
});
