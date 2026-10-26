import type { FlowchartSnapshot, FlowchartPageBounds } from "@quirekit/flowchart";

const namespace = "http://www.w3.org/2000/svg";
const tags = new Set(["svg", "g", "defs", "path", "rect", "ellipse", "circle", "polygon", "polyline", "line", "text", "tspan", "clipPath", "mask", "marker", "linearGradient", "radialGradient", "stop", "use", "image", "a", "title", "desc"]);
const styleProperties = new Set(["font-family", "font-size", "font-weight", "font-style", "text-decoration", "text-anchor", "dominant-baseline", "alignment-baseline", "fill", "stroke", "stroke-width", "stroke-dasharray", "stroke-linecap", "stroke-linejoin", "opacity", "fill-opacity", "stroke-opacity", "visibility", "display", "stop-color", "stop-opacity"]);
const ignoredStyles = new Set(["cursor", "pointer-events", "touch-action", "user-select", "overflow"]);
/** @param element - Static caption. @returns Whether an ancestor makes the entire caption nonpainting. */
function hidden(element: Element): boolean {
  for (let current: Element | null = element; current; current = current.parentElement) {
    if (current.getAttribute("display") === "none" || current.getAttribute("opacity")?.trim() === "0") return true;
  }
  return false;
}
/** @param source - Frozen SVG. @param owner - Explicit browser parser. @returns Detached static tree admitted for the vector encoder. */
export function readPdfSvg(source: string, owner: Document): SVGSVGElement {
  if (!owner.defaultView) throw new Error("PDF 导出需要浏览器文档");
  if (new TextEncoder().encode(source).length > 32 * 1024 * 1024 || /<!DOCTYPE|<!ENTITY/i.test(source)) throw new RangeError("PDF SVG 超过资源预算或含无效声明");
  const xml = new owner.defaultView.DOMParser().parseFromString(source, "image/svg+xml"), root = xml.documentElement;
  if (root.localName !== "svg" || root.namespaceURI !== namespace || xml.querySelector("parsererror")) throw new Error("无效 PDF SVG 快照");
  const elements = [root, ...root.querySelectorAll("*")]; if (elements.length > 100000) throw new RangeError("PDF SVG 超过资源预算或含无效声明");
  for (const element of elements) {
    if (!tags.has(element.localName) || element.namespaceURI !== namespace) throw new Error("PDF SVG 含不支持的绘制内容");
    for (const attr of [...element.attributes]) {
      if (/^on/i.test(attr.name) || ["filter", "mix-blend-mode", "vector-effect"].includes(attr.name)) throw new Error("PDF SVG 含不支持的绘制内容");
      if (attr.localName === "href" && !attr.value.startsWith("#") && !/^(data:image\/png;base64,|data:image\/svg\+xml;charset=utf-8,)/.test(attr.value)
        && !(element.localName === "a" && /^(https?:\/\/|mailto:)/i.test(attr.value))) throw new Error("PDF SVG 含外部资源");
      if (/url\(/i.test(attr.value) && !/^url\(\s*['"]?#[\w:.-]+['"]?\s*\)$/i.test(attr.value)) throw new Error("PDF SVG 含外部资源");
    }
    for (const declaration of (element.getAttribute("style") ?? "").split(";")) if (declaration.trim()) {
      const separator = declaration.indexOf(":"), key = declaration.slice(0, separator).trim(), value = declaration.slice(separator + 1).trim();
      if (styleProperties.has(key)) element.setAttribute(key, value);
      else if (!ignoredStyles.has(key)) throw new Error("PDF SVG 含不支持的绘制内容");
    }
    element.removeAttribute("style");
  }
  // X6 keeps empty image captions as hidden text placeholders. They require
  // no physical glyphs and must not make an image-only export fetch fonts.
  for (const text of root.querySelectorAll("text")) if (!text.textContent || hidden(text)) text.remove();
  return root as unknown as SVGSVGElement;
}
/** @param snapshot - Frozen adapter content. @param owner - Explicit document. @returns World bounds shared with the existing plan. */
export function pdfSvgBounds(snapshot: FlowchartSnapshot, owner: Document): FlowchartPageBounds {
  const values = readPdfSvg(snapshot.svg, owner).getAttribute("viewBox")?.trim().split(/[\s,]+/).map(Number);
  if (!values || values.length !== 4 || !values.every(Number.isFinite) || values[2]! <= 0 || values[3]! <= 0) throw new Error("PDF SVG 缺少有效边界");
  return { x: values[0]!, y: values[1]!, width: values[2]!, height: values[3]! };
}
