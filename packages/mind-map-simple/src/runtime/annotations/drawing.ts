import type { MindMapAnnotation } from "@quirekit/mind-map";
import { annotationBounds } from "./geometry";
import { measureAnnotationCaption, placeBoundaryCaption, relationBaseline, routeAnnotationRelation } from "./placement";
import type { AnnotationTopicGeometry } from "./types";

/** @param parent - Owned SVG parent. @param tag - Native SVG element. @param attrs - Safe numeric/style attributes.
 * @returns Appended element, never parsed from user markup. */
export function annotationElement<K extends keyof SVGElementTagNameMap>(parent: SVGElement, tag: K,
  attrs: Record<string, string | number> = {}): SVGElementTagNameMap[K] {
  const element = parent.ownerDocument.createElementNS("http://www.w3.org/2000/svg", tag);
  for (const [key, value] of Object.entries(attrs)) element.setAttribute(key, String(value));
  parent.append(element); return element;
}

/** @param text - Literal caption. @returns Bounded Unicode lines used consistently for placement and drawing. */
function captionLines(text: string): string[] { return text.split("\n").flatMap(line => line.match(/.{1,16}/gu) ?? [""]); }

/** @param parent - Annotation group. @param text - Literal caption. @param x - Caption center. @param y - First baseline.
 * @param color - Resolved color. @param surface - Host surface behind text. */
function caption(parent: SVGGElement, text: string, x: number, y: number, color: string, surface: string): void {
  if (!text) return;
  const label = annotationElement(parent, "text", { x, y, fill: color, "font-size": 14, "text-anchor": "middle" });
  const lines = captionLines(text);
  lines.forEach((line, index) => { annotationElement(label, "tspan", { x, dy: index ? 19 : 0 }).textContent = line; });
  const bounds = label.getBBox();
  const backdrop = annotationElement(parent, "rect", { x: bounds.x - 5, y: bounds.y - 3, width: bounds.width + 10,
    height: bounds.height + 6, rx: 4, fill: surface });
  parent.insertBefore(backdrop, label);
}

/** @param item - Validated semantic object. @param geometry - Completed visible topic geometry.
 * @param layer - Owned SVG layer. @param primary - Host accent. @param surface - Host caption surface. */
export function drawMindMapAnnotation(item: MindMapAnnotation, geometry: ReadonlyMap<string, AnnotationTopicGeometry>,
  layer: SVGGElement, primary: string, surface: string): void {
  const color = item.color ?? primary;
  if (item.kind === "relation") {
    const source = geometry.get(item.from)?.node, target = geometry.get(item.to)?.node;
    if (!source || !target) return;
    const size = item.text ? measureAnnotationCaption(captionLines(item.text)) : null;
    const others = [...geometry.values()].map(topic => topic.node).filter(node => node !== source && node !== target);
    const { start: a, control: c, end: b, caption: anchor } = routeAnnotationRelation(source, target, others, size);
    const group = annotationElement(layer, "g", { "data-qk-mind-annotation": item.id, "data-kind": item.kind });
    annotationElement(group, "path", { d: `M${a.x},${a.y} Q${c.x},${c.y} ${b.x},${b.y}`, fill: "none", stroke: color, "stroke-width": 1.5, "stroke-dasharray": "6 4" });
    const length = Math.max(1, Math.hypot(b.x - c.x, b.y - c.y)), ux = (b.x - c.x) / length, uy = (b.y - c.y) / length;
    annotationElement(group, "polygon", { points: `${b.x},${b.y} ${b.x - 10 * ux + 4 * uy},${b.y - 10 * uy - 4 * ux} ${b.x - 10 * ux - 4 * uy},${b.y - 10 * uy + 4 * ux}`, fill: color });
    if (size) caption(group, item.text, anchor.x, relationBaseline(anchor.y, size), color, surface);
    return;
  }
  const topics = item.topicIds.flatMap(id => { const value = geometry.get(id); return value ? [value] : []; });
  if (!topics.length) return;
  const bounds = annotationBounds(topics.map(topic => topic.subtree));
  const group = annotationElement(layer, "g", { "data-qk-mind-annotation": item.id, "data-kind": item.kind });
  if (item.kind === "boundary") {
    annotationElement(group, "rect", { x: bounds.x - 12, y: bounds.y - 14, width: bounds.width + 24, height: bounds.height + 28,
      rx: 10, fill: color, "fill-opacity": 0.06, stroke: color, "stroke-width": 1.5, "stroke-dasharray": "5 4" });
    if (item.text) {
      const baseline = bounds.y - 24 - (captionLines(item.text).length - 1) * 19;
      const outside = [...geometry.values()].map(topic => topic.node).filter(node => node.x >= bounds.x + bounds.width || node.x + node.width <= bounds.x
        || node.y >= bounds.y + bounds.height || node.y + node.height <= bounds.y);
      caption(group, item.text, placeBoundaryCaption(bounds, outside, measureAnnotationCaption(captionLines(item.text)), baseline), baseline, color, surface);
    }
  } else {
    const side = topics.every(topic => topic.side === "left") ? -1 : 1;
    const x = side === 1 ? bounds.x + bounds.width + 20 : bounds.x - 20, y = bounds.y - 4, bottom = bounds.y + bounds.height + 4;
    annotationElement(group, "path", { d: `M${x - side * 8},${y} H${x} V${bottom} H${x - side * 8}`, fill: "none", stroke: color, "stroke-width": 1.5 });
    const chars = Math.min(16, Math.max(...item.text.split("\n").map(line => Array.from(line).length)));
    caption(group, item.text, x + side * (chars * 7 + 18), (y + bottom) / 2 + 5 - (captionLines(item.text).length - 1) * 19 / 2, color, surface);
  }
}
