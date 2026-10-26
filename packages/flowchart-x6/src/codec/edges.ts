import { relationMarkerPath } from "../geometry/markers";
import type { CellAttrs, EdgeMetadata, TerminalData } from "@antv/x6";
import type { FlowchartArrow, FlowchartEdge, FlowchartTerminal } from "@quirekit/flowchart";
import type { FlowchartAppearance } from "../types";

/** @param value - Portable attachment. @returns Private vendor attachment. */
export function toX6Terminal(value: FlowchartTerminal): TerminalData {
  return "node" in value ? { cell: value.node, ...(value.port ? { port: value.port } : {}),
    ...(value.anchor ? { anchor: { name: "quirekit-relative", args: { ...value.anchor } }, connectionPoint: { name: "anchor" } } : {}) } : { ...value };
}
/** @param arrow - Admitted marker. @param stroke - Explicit pen color. @param surface - Background behind hollow endpoints. @returns Marker metadata independent of the invisible measurement stroke. */
function marker(arrow: FlowchartArrow, stroke: string, surface: string) {
  if (arrow === "none") return null;
  const path = relationMarkerPath(arrow);
  if (path) return { refX: 0, fill: arrow.endsWith("-hollow") ? surface : "none", stroke, strokeWidth: 1.2, children: [{ tagName: "path", d: path },
    ...(arrow.startsWith("er-zero-") ? [{ tagName: "circle", cx: 19, cy: 0, r: 3, fill: surface }] : [])] };
  if (arrow === "circle") return { name: "circle", r: 3.5, fill: stroke, stroke };
  return { name: arrow === "open" ? "block" : arrow, open: arrow === "open", width: arrow === "diamond" ? 10 : 8, height: 7,
    fill: arrow === "open" ? "none" : stroke, stroke, strokeWidth: 1.2 };
}
/** @param edge - Portable connector. @param appearance - Current presentation. @returns Explicit SVG connector attributes. */
export function edgeAttrs(edge: FlowchartEdge, appearance: FlowchartAppearance): CellAttrs {
  const stroke = edge.style.stroke ?? appearance.line, width = edge.style.width ?? 1.5, drawing = edge.style.drawing ?? "standard";
  return { line: { connection: true, stroke: drawing === "standard" ? stroke : "transparent", strokeWidth: width,
    "marker-start": null, "marker-end": null,
    strokeDasharray: edge.style.dashed ? "6 4" : "", sourceMarker: marker(edge.style.sourceArrow ?? "none", stroke, appearance.surface),
    targetMarker: marker(edge.style.targetArrow ?? "block", stroke, appearance.surface) },
    drawing: { quirekitSketch: { id: edge.id, drawing, width }, fill: "none", stroke, strokeWidth: width,
      strokeDasharray: edge.style.dashed ? "6 4" : "", strokeLinecap: "round", pointerEvents: "none" } };
}
/** @param edge - Source routing and corner choice. @returns Derived vendor route and connector. */
export function edgeGeometry(edge: FlowchartEdge): Pick<EdgeMetadata, "router" | "connector"> {
  const sourceAxis = portAxis(edge.source), targetAxis = portAxis(edge.target);
  // Fixed ports own the endpoint tangents. X6's distance-based fallback can
  // otherwise turn a left/right attachment vertically when a branch is tall.
  const direction = sourceAxis === targetAxis ? sourceAxis : undefined;
  return { router: edge.routing === "orthogonal" ? { name: "quirekit-flow-manhattan" } : { name: "normal" },
    connector: edge.crossing && edge.crossing !== "none" ? { name: "jumpover", args: { type: edge.crossing === "jump" ? "arc" : "gap", size: 6, radius: edge.connector === "sharp" ? 0 : 8 } }
      : edge.connector === "smooth" ? { name: "smooth", args: direction ? { direction } : {} }
      : { name: edge.connector === "sharp" ? "normal" : "rounded", args: { radius: 8 } } };
}
/** @param terminal - Portable fixed or free attachment. @returns The axis owned by an explicit port, if any. */
function portAxis(terminal: FlowchartTerminal): "H" | "V" | undefined {
  if (!("node" in terminal) || !terminal.port) return undefined;
  return terminal.port === "left" || terminal.port === "right" ? "H" : "V";
}
/** @param edge - Portable connector. @param appearance - Theme for SVG labels. @returns Explicit label presentation. */
export function edgeLabels(edge: FlowchartEdge, appearance: FlowchartAppearance) {
  return [{ position: { distance: edge.labelPosition, offset: edge.labelOffset ?? 12, options: { keepGradient: false } },
    attrs: { label: { text: edge.label, fill: appearance.text, fontSize: 13, fontFamily: appearance.fontFamily },
      body: { fill: "transparent", stroke: "none", pointerEvents: "all" } } }];
}
/** @param edge - Validated source edge. @param appearance - Display theme. @returns Private vendor metadata. */
export function toX6Edge(edge: FlowchartEdge, appearance: FlowchartAppearance): EdgeMetadata {
  return { id: edge.id, shape: "edge", source: toX6Terminal(edge.source), target: toX6Terminal(edge.target),
    vertices: edge.vertices.map(p => ({ ...p })), ...edgeGeometry(edge),
    markup: [{ tagName: "path", selector: "wrap", attrs: { class: "qk-flow-hit", fill: "none", cursor: "pointer", stroke: "transparent", strokeWidth: 10 } },
      { tagName: "path", selector: "line", attrs: { fill: "none", pointerEvents: "none" } }, { tagName: "path", selector: "drawing" }],
    attrs: { wrap: { connection: true }, ...edgeAttrs(edge, appearance) }, labels: edgeLabels(edge, appearance), data: { source: edge } };
}
