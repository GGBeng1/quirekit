import { serializeMindMap, type MindMapDocument, type MindMapSnapshot, type MindMapNode } from "@quirekit/mind-map";
import type { SimpleInstance } from "../vendor/types";

/**
 * Exports settled plain-text SVG in its natural CSS-pixel coordinate space.
 * @param instance - Settled vendor instance.
 * @param document - Canonical source read in the same settled state.
 * @returns A self-contained SVG without transient selection controls.
 */
export function captureMindMapSvg(instance: SimpleInstance, document: MindMapDocument): MindMapSnapshot {
  const padding = 20;
  const bounds = instance.draw.bbox();
  if (![bounds.x, bounds.y, bounds.width, bounds.height].every(Number.isFinite)
    || bounds.width <= 0 || bounds.height <= 0) throw new Error("Invalid mind map SVG bounds");
  const result = instance.getSvgData({ paddingX: 20, paddingY: 20 });
  const xml = new DOMParser().parseFromString(result.svgHTML, "image/svg+xml");
  if (xml.querySelector("parsererror,script,foreignObject")) throw new Error("Unexpected mind map SVG content");
  // The vendor clone mixes page and viewport coordinates in scrolled hosts.
  // Normalize its artwork using settled local geometry, without changing the live view.
  const content = xml.querySelector(".smm-container");
  if (!content) throw new Error("Missing mind map SVG content");
  content.setAttribute("transform", `translate(${padding - bounds.x},${padding - bounds.y})`);
  const width = bounds.width + padding * 2, height = bounds.height + padding * 2;
  xml.documentElement.setAttribute("width", String(width));
  xml.documentElement.setAttribute("height", String(height));
  xml.documentElement.setAttribute("viewBox", `0 0 ${width} ${height}`);
  const images = new Set<string>();
  /** @param node - Canonical source topic. */
  function visit(node: MindMapNode): void { if (node.details?.image) images.add(node.details.image.dataUrl); node.children.forEach(visit); }
  visit(document.root); document.floatingTopics?.forEach(topic => visit(topic.root));
  for (const image of xml.querySelectorAll("image")) {
    const href = image.getAttribute("href") ?? image.getAttributeNS("http://www.w3.org/1999/xlink", "href");
    if (!href || !images.has(href)) throw new Error("Unexpected external mind map image");
  }
  // Exported pictures retain link glyphs but never carry navigation behavior.
  xml.querySelectorAll("a").forEach(anchor => anchor.replaceWith(...anchor.childNodes));
  // Hover and collapse controls are interaction state, never document artwork.
  xml.querySelectorAll(".smm-hover-node,.smm-expand-btn,.smm-quick-create-child-btn").forEach(node => node.remove());
  return Object.freeze({ svg: new XMLSerializer().serializeToString(xml), width, height,
    revision: document.revision, source: serializeMindMap(document) });
}
