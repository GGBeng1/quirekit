import { create } from "fontkit";
import type { FlowchartPdfFontSource } from "../types";
import type { PdfFontFace, SvgFontStyle } from "./types";
import { v4 as uuidv4 } from "uuid";

/** @param element - Static text owner. @returns Inherited explicit typography; live application CSS never enters output. */
function style(element: Element): SvgFontStyle {
  let family: string | null = null, weight: string | null = null, posture: string | null = null;
  for (let current: Element | null = element; current; current = current.parentElement) {
    family ??= current.getAttribute("font-family"); weight ??= current.getAttribute("font-weight"); posture ??= current.getAttribute("font-style");
  }
  return { family: family ?? "sans-serif", bold: weight === "bold" || Number(weight) >= 600, italic: posture === "italic" || posture === "oblique" };
}
/** @param source - Licensed physical face. @param requested - Inherited typography. @returns Deterministic match rank, preferring an approved sans fallback over unrelated families. */
function rank(source: FlowchartPdfFontSource, requested: SvgFontStyle): number {
  const families = requested.family.split(",").map(value => value.trim().replace(/^['"]|['"]$/g, "").toLowerCase());
  const matched = [source.family, ...(source.acceptedSubstitutions ?? [])].some(name => families.includes(name.toLowerCase()));
  return (matched ? 0 : source.fallback ? /symbols/i.test(source.family) ? 30 : 10 : 40)
    + Math.abs(source.weight - (requested.bold ? 700 : 400)) / 100 + (source.style === (requested.italic ? "italic" : "normal") ? 0 : 2);
}
/** @param root - Admitted static SVG. @param sources - Frozen application resources. @param signal - One export lifetime. @returns Only faces actually used, with every visible character covered and task-local SVG font names. */
export async function preparePdfFonts(root: SVGSVGElement, sources: readonly FlowchartPdfFontSource[], signal: AbortSignal): Promise<readonly PdfFontFace[]> {
  if (sources.length > 64 || new Set(sources.map(source => source.id)).size !== sources.length) throw new RangeError("PDF 字体配置无效");
  const loaded = new Map<string, PdfFontFace>(), used = new Set<PdfFontFace>(); let totalBytes = 0;
  const glyphs = new Map<string, PdfFontFace>(); let checked = 0;
  const prefix = `qk-pdf-${uuidv4()}`;
  /** @param source - Selected physical resource. @returns Task-local parsed immutable bytes. */
  async function load(source: FlowchartPdfFontSource): Promise<PdfFontFace> {
    const cached = loaded.get(source.id); if (cached) return cached;
    const result = await source.data(); signal.throwIfAborted();
    const bytes = new Uint8Array(result instanceof ArrayBuffer ? new Uint8Array(result) : result);
    totalBytes += bytes.byteLength;
    if (!bytes.byteLength || bytes.byteLength > 20 * 1024 * 1024 || totalBytes > 64 * 1024 * 1024) throw new RangeError("PDF 字体超过资源预算");
    // fontkit's browser API accepts Uint8Array. Its Node-oriented declaration
    // still names Buffer; this bridge never imports a Node polyfill.
    const font = create(bytes as Parameters<typeof create>[0]); if (!("hasGlyphForCodePoint" in font)) throw new Error("PDF 字体配置无效");
    const face = { source, bytes, font, name: `${prefix}-${loaded.size}` }; loaded.set(source.id, face); return face;
  }
  const walker = root.ownerDocument.createTreeWalker(root, 4), nodes: Text[] = [];
  while (walker.nextNode()) if (["text", "tspan"].includes(walker.currentNode.parentElement?.localName ?? "")) nodes.push(walker.currentNode as Text);
  // Resolve immutable text first, then rewrite only leaf text nodes into runs.
  // This preserves explicit X6 line positions, nested styles and safe links.
  for (const node of nodes) {
    const parent = node.parentElement!; if (!node.data) continue;
    const requested = style(parent), ordered = [...sources].sort((a, b) => rank(a, requested) - rank(b, requested));
    const fragment = root.ownerDocument.createDocumentFragment(); let current: Element | undefined, previous: PdfFontFace | undefined;
    for (const char of node.data) {
      if (++checked % 512 === 0) await new Promise<void>(resolve => setTimeout(resolve, 0));
      signal.throwIfAborted(); const code = char.codePointAt(0)!, key = JSON.stringify([requested, code]); let face = glyphs.get(key);
      for (const source of face ? [] : ordered) {
        const candidate = await load(source);
        if (candidate.font.hasGlyphForCodePoint(code) || /[\n\r\t]/.test(char)) { face = candidate; break; }
      }
      if (!face) throw new Error(`PDF 字体缺少字符 U+${code.toString(16).toUpperCase()}`);
      glyphs.set(key, face);
      used.add(face);
      if (face !== previous) {
        current = root.ownerDocument.createElementNS("http://www.w3.org/2000/svg", "tspan"); current.setAttribute("font-family", face.name); fragment.append(current); previous = face;
      }
      current!.append(root.ownerDocument.createTextNode(char));
    }
    node.replaceWith(fragment);
  }
  // The SVG backend resolves a font on every text container, including parents
  // whose only content is nested tspans. Give those containers an admitted face
  // too, while child runs retain their exact physical-font authority.
  for (const element of root.querySelectorAll("text,tspan")) {
    if (element.getAttribute("font-family")?.startsWith(prefix)) continue;
    const face = [...used].sort((a, b) => rank(a.source, style(element)) - rank(b.source, style(element)))[0];
    if (face) element.setAttribute("font-family", face.name);
  }
  return [...used];
}
