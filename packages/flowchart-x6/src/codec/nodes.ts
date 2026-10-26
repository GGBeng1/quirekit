import { compartmentAttrs } from "./compartments";
import { captionLayout } from "../geometry/caption";
import type { CellAttrs, NodeMetadata } from "@antv/x6";
import { flowchartImagePlacement, isFlowchartContainer, isSequenceFragment, isSequenceParticipant, type FlowchartNode } from "@quirekit/flowchart";
import type { FlowchartAppearance } from "../types";
import { shapeGeometry } from "../geometry/shapes";
import { sketchPaths } from "../drawing/rough";
import { richCaptionMarkup } from "../text/markup";
import { imageMarkup } from "./images";

/** @param node - Portable shape. @param appearance - Current presentation. @returns Fully explicit SVG attributes. */
export function nodeAttrs(node: FlowchartNode, appearance: FlowchartAppearance): CellAttrs {
  const caption = captionLayout(node);
  const style = node.style, geometry = shapeGeometry(node), drawing = style.drawing ?? "standard";
  const stroke = style.stroke ?? appearance.primary, fill = style.fill ?? appearance.surface;
  const rough = sketchPaths(geometry.visible && !node.image ? geometry.outline : "", node.id, drawing, 1.5, Math.max(node.width, node.height), true);
  const detail = sketchPaths(geometry.detail, `${node.id}-detail`, drawing, 1.5, 0);
  const container = isFlowchartContainer(node.shape), headerWidth = node.shape === "lane-horizontal" ? Math.min(104, node.width / 4) : node.width;
  const headerHeight = node.shape === "lane-horizontal" ? node.height : Math.min(48, node.height / 3);
  const transform = `translate(${node.flipX ? node.width : 0},${node.flipY ? node.height : 0}) scale(${node.flipX ? -1 : 1},${node.flipY ? -1 : 1})`;
  const image = node.image ? flowchartImagePlacement(node.image, node.width, node.height) : undefined;
  return {
    ...compartmentAttrs(node, appearance),
    imageFrame: { transform }, imageClip: { ...image?.clip },
    image: { x: image?.x ?? 0, y: image?.y ?? 0, width: image?.width ?? node.width, height: image?.height ?? node.height, href: node.image?.dataUrl ?? "", preserveAspectRatio: "none", "aria-label": node.image?.alt ?? "", role: "img", pointerEvents: "none" },
    // Containers sit below their children. Their free interior is an owner hit,
    // while higher child views keep direct selection and drag ownership.
    body: { transform, d: geometry.outline, fill: node.image ? "transparent" : geometry.visible && !isSequenceFragment(node.shape) ? fill : "transparent", stroke: node.image ? "none" : geometry.visible && drawing === "standard" ? stroke : "none", strokeWidth: 1.5, pointerEvents: isSequenceFragment(node.shape) ? "stroke" : node.image || container ? "all" : "visiblePainted" },
    headerHit: { transform, d: node.shape !== "group" && container ? `M0 0 H${headerWidth} V${headerHeight} H0 Z`
      : node.shape === "actor" || node.shape === "actor-lifeline" ? `M${geometry.textX - geometry.textWidth / 2} ${geometry.textY - geometry.textHeight / 2} h${geometry.textWidth} v${geometry.textHeight} h${-geometry.textWidth} Z` : "", fill: "transparent", stroke: "none" },
    drawingFill: { transform, d: drawing === "standard" || node.image ? "" : rough.fill, fill: drawing === "sketch" && !isSequenceFragment(node.shape) ? fill : "none",
      stroke: drawing === "pencil" && !isSequenceFragment(node.shape) ? stroke : "none", strokeWidth: 0.7, opacity: drawing === "pencil" ? 0.38 : 1, pointerEvents: "none" },
    drawingOutline: { transform, d: drawing === "standard" || node.image ? "" : rough.outline, fill: "none", stroke, strokeWidth: 1.5, pointerEvents: "none" },
    detail: { transform, d: detail.outline, fill: "none", stroke, strokeWidth: 1.5, pointerEvents: "none" },
    lifelineHit: { transform, d: geometry.hitPath ?? "", fill: "none", stroke: "transparent", strokeWidth: 12 },
    // Rect also owns a CSS `text` selector, beyond its named label. Explicitly
    // clear that inherited relative placement before using positioned rich runs.
    ...(node.textSpans?.length ? { text: { refX: null, refY: null, textVerticalAnchor: null, textAnchor: "start", fontFamily: appearance.fontFamily, fontSize: 14 } } : {}),
    richLabel: { pointerEvents: "none", opacity: 1 },
    label: node.textSpans?.length ? {} : { text: node.shape === "group" || node.image ? "" : node.text, fill: style.color ?? appearance.text, fontSize: style.fontSize ?? 14,
      fontWeight: style.bold ? 600 : 400, fontFamily: appearance.fontFamily, refX: 0, refY: 0, x: caption.x, y: caption.y,
      textAnchor: caption.anchor, textVerticalAnchor: caption.verticalAnchor, pointerEvents: "none", opacity: 1,
      textWrap: { width: caption.width - node.width, height: caption.height - node.height, ellipsis: true } },
  };
}
/** @param node - Canonical size/shape. @param appearance - Current theme. @returns Exact port positions on the visible contour. */
export function nodePorts(node: FlowchartNode, appearance: FlowchartAppearance): NonNullable<NodeMetadata["ports"]> {
  const geometry = shapeGeometry(node);
  if (node.shape === "group") return { items: [] };
  return { groups: { outline: { position: "absolute", attrs: { circle: { r: 4, magnet: true, fill: appearance.surface, stroke: appearance.primary, strokeWidth: 1.5 } } } },
    items: Object.entries(geometry.ports).map(([id, point]) => ({ id, group: "outline", args: { x: node.flipX ? node.width - point.x : point.x, y: node.flipY ? node.height - point.y : point.y } })) };
}
/** @param node - Validated portable node. @param appearance - Current presentation. @param document - Actual graph owner for rich caption measurement. @returns Private X6 node metadata. */
export function toX6Node(node: FlowchartNode, appearance: FlowchartAppearance, document?: Document): NodeMetadata {
  return { id: node.id, shape: isFlowchartContainer(node.shape) ? "qk-flow-container" : isSequenceParticipant(node.shape) || node.shape.startsWith("phase-") ? "qk-flow-lifeline" : "rect", x: node.x, y: node.y, angle: node.rotation ?? 0, width: node.width, height: node.height,
    markup: nodeMarkup(node, appearance, document),
    attrs: nodeAttrs(node, appearance), data: { source: node }, ports: nodePorts(node, appearance) };
}

/** @param node - Current structured content. @param appearance - Theme. @param document - Actual graph owner for partial fonts. @returns Only visible row markup, regenerated when content or bounds change. */
export function nodeMarkup(node: FlowchartNode, appearance: FlowchartAppearance, document?: Document): NonNullable<NodeMetadata["markup"]> {
  if (node.textSpans?.length && !document) throw new Error("文字测量不可用");
  return [...["body", "drawingFill", "drawingOutline", "detail"].map(selector => ({ tagName: "path", selector })),
    { tagName: "path", selector: "lifelineHit", attrs: { class: "qk-flow-hit" } },
    { tagName: "path", selector: "headerHit", attrs: { class: "qk-flow-hit" } },
    ...(node.image ? imageMarkup() : []),
    node.textSpans?.length ? richCaptionMarkup(node, appearance, document!) : { tagName: "text", selector: "label" },
    ...Object.keys(compartmentAttrs(node, appearance)).map(selector => ({ tagName: "text", selector }))];
}
