import type { PdfFontFace } from "../fonts/types";

/** @param root - Admitted world SVG with embedded-font run names. @param fonts - Used physical resources. @param width - Normalized vector page width. @param height - Normalized vector page height. @param signal - Task lifetime. @returns One bounded intermediate vector page, encoded exactly once. */
export async function encodeVectorPage(root: SVGSVGElement, fonts: readonly PdfFontFace[], width: number, height: number, signal: AbortSignal): Promise<Uint8Array<ArrayBuffer>> {
  const [{ default: PDFDocument }, { default: svgToPdf }] = await Promise.all([import("pdfkit"), import("svg-to-pdfkit")]); signal.throwIfAborted();
  // PDFKit 0.20 accepts font:null and Uint8Array; its separately maintained
  // 0.17 declaration still describes only Buffer/string. Keep that narrow
  // compatibility cast inside this tested public-backend bridge.
  const document = new PDFDocument({ size: [width, height], margin: 0, compress: true, font: null as never });
  const chunks: Uint8Array[] = []; let length = 0, failed = false;
  const output = new Promise<Uint8Array<ArrayBuffer>>((resolve, reject) => {
    document.on("data", (chunk: Uint8Array) => {
      if (failed) return;
      length += chunk.byteLength;
      if (length > 32 * 1024 * 1024) { failed = true; chunks.length = 0; reject(new RangeError("PDF 超过输出预算")); } else chunks.push(chunk);
    });
    document.on("error", reject);
    document.on("end", () => {
      if (failed) return;
      if (signal.aborted) { reject(signal.reason); return; }
      const bytes = new Uint8Array(length); let offset = 0;
      for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; } resolve(bytes);
    });
  });
  const names = new Map(fonts.map(face => [face.name, face]));
  fonts.forEach(face => document.registerFont(face.name, face.bytes as never));
  try {
    svgToPdf(document, root, 0, 0, { width, height, assumePt: true, useCSS: false,
      /** @param family - Prepared unique run name. @param bold - Requested weight. @param italic - Requested posture. @param options - Encoder's explicit simulated style flags. @returns Registered physical face. */
      fontCallback(family, bold, italic, options) {
        const face = names.get(family.replace(/^['"]|['"]$/g, "")); if (!face) throw new Error("PDF 字体配置无效");
        options.fauxBold = bold && face.source.weight < 600; options.fauxItalic = italic && face.source.style !== "italic"; return face.name;
      },
      /** @param warning - Unsupported SVG semantics reported by the backend. */
      warningCallback(warning) { throw new Error(`PDF 绘制未完成：${warning}`); },
    });
    document.end(); return await output;
  } catch (error) {
    document.end(); await output.catch(() => {}); throw error;
  }
}
