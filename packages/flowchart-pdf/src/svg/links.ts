import type { PdfFontFace } from "../fonts/types";
import type { PdfSvgLink } from "./types";

/** @param root - Prepared normalized SVG. @param fonts - Explicit physical resources. @param owner - Browser document. @param signal - Task lifetime. @returns Frozen link bounds; task-only font faces and measurement DOM are always removed. */
export async function measurePdfLinks(root: SVGSVGElement, fonts: readonly PdfFontFace[], owner: Document, signal: AbortSignal): Promise<readonly PdfSvgLink[]> {
  if (!root.querySelector("a")) return [];
  const view = owner.defaultView!; const installed: FontFace[] = [], mount = owner.createElement("div"); mount.inert = true;
  Object.assign(mount.style, { position: "fixed", left: "-100000px", top: "0", pointerEvents: "none", visibility: "hidden" });
  try {
    for (const font of fonts) {
      const face = new view.FontFace(font.name, font.bytes, { weight: String(font.source.weight), style: font.source.style });
      await face.load(); signal.throwIfAborted(); owner.fonts.add(face); installed.push(face);
    }
    const svg = owner.importNode(root, true); mount.append(svg); owner.body.append(mount);
    const origin = svg.getScreenCTM(); if (!origin) throw new Error("PDF 链接测量失败");
    const inverse = origin.inverse(), height = Number(svg.getAttribute("height")), result: PdfSvgLink[] = [];
    for (const link of svg.querySelectorAll<SVGAElement>("a")) {
      const url = link.getAttribute("href") ?? link.getAttributeNS("http://www.w3.org/1999/xlink", "href"); if (!url || !/^(https?:\/\/|mailto:)/i.test(url)) continue;
      const box = link.getBBox(), transform = link.getScreenCTM(); if (!transform) continue;
      const points = [[box.x, box.y], [box.x + box.width, box.y], [box.x, box.y + box.height], [box.x + box.width, box.y + box.height]].map(([x, y]) => new view.DOMPoint(x, y).matrixTransform(transform).matrixTransform(inverse));
      const x = Math.min(...points.map(p => p.x)), y = Math.min(...points.map(p => p.y)), right = Math.max(...points.map(p => p.x)), bottom = Math.max(...points.map(p => p.y));
      // getBBox/CTM are graph coordinates. The normalized viewport has the
      // original world viewBox, so convert once before the physical-page phase.
      const world = svg.viewBox.baseVal, ratio = Number(svg.getAttribute("width")) / world.width;
      result.push({ url, x: (x - world.x) * ratio, y: height - (bottom - world.y) * ratio, width: (right - x) * ratio, height: (bottom - y) * ratio });
    }
    return result;
  } finally { mount.remove(); for (const face of installed) owner.fonts.delete(face); }
}
