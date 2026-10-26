import { readPdfSvg } from "./read";

/** @param root - Admitted static SVG. @param owner - Parser realm. Expands vector image resources without rasterizing icons or mixing their IDs. */
export function expandPdfSvgImages(root: SVGSVGElement, owner: Document): void {
  let sequence = 0;
  for (const image of [...root.querySelectorAll("image")]) {
    const href = image.getAttribute("href") ?? image.getAttributeNS("http://www.w3.org/1999/xlink", "href") ?? "";
    if (!href.startsWith("data:image/svg+xml;charset=utf-8,")) continue;
    const svg = readPdfSvg(decodeURIComponent(href.slice("data:image/svg+xml;charset=utf-8,".length)), owner), prefix = `qk-vector-${++sequence}-`;
    if (svg.querySelector("image")) throw new Error("PDF SVG 含不支持的绘制内容");
    const identifiers = new Map<string, string>();
    for (const element of [svg, ...svg.querySelectorAll("*")]) if (element.id) { identifiers.set(element.id, prefix + element.id); element.id = prefix + element.id; }
    for (const element of [svg, ...svg.querySelectorAll("*")]) for (const attr of [...element.attributes]) {
      if (attr.value.startsWith("#") && identifiers.has(attr.value.slice(1))) element.setAttributeNS(attr.namespaceURI, attr.name, `#${identifiers.get(attr.value.slice(1))}`);
      else if (attr.value.startsWith("url(")) element.setAttributeNS(attr.namespaceURI, attr.name, attr.value.replace(/#([\w:.-]+)/g, (_, id: string) => `#${identifiers.get(id) ?? id}`));
    }
    for (const attr of [...image.attributes]) if (!["href", "xlink:href", "preserveAspectRatio"].includes(attr.name)) svg.setAttributeNS(attr.namespaceURI, attr.name, attr.value);
    svg.setAttribute("preserveAspectRatio", image.getAttribute("preserveAspectRatio") ?? "xMidYMid meet");
    image.replaceWith(owner.importNode(svg, true));
  }
}
