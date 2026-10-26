import { readFlowchartTransform } from "../transform/validation";
import { readNodeContent } from "../modeling/read";
import type { FlowchartDocument, FlowchartEdge, FlowchartNode, FlowchartPoint, FlowchartTerminal } from "./types";
import { array, choice, identity, number, record, text } from "./validation";
import { readStyle } from "./styles";
import { flowchartShapes } from "./shapes";
import { validateHierarchy } from "../structure/hierarchy";
import { readFlowchartImage } from "../media/image";
import { canFormatFlowchartText, readFlowchartTextSpans } from "../text/validation";
import { readFlowchartPageSettings } from "../pages/settings";

/** @param value - Coordinate candidate. @returns Immutable world point. */
function point(value: unknown): FlowchartPoint {
  const p = record(value, ["x", "y"], "point");
  return Object.freeze({ x: number(p.x, -1e6, 1e6, "x"), y: number(p.y, -1e6, 1e6, "y") });
}
/** @param input - Untrusted endpoint. @param nodes - Existing shape IDs. @returns Checked immutable attachment. */
function terminal(input: unknown, nodes: Set<string>): FlowchartTerminal {
  const value = record(input, ["node", "port", "anchor", "x", "y"], "terminal");
  if (!Object.hasOwn(value, "node")) return point(value);
  record(value, ["node", "port", "anchor"], "terminal");
  const node = identity(value.node);
  if (!nodes.has(node)) throw new TypeError("terminal: missing node");
  if (Object.hasOwn(value, "anchor")) {
    if (Object.hasOwn(value, "port")) throw new TypeError("terminal: anchor and port are mutually exclusive");
    const anchor = record(value.anchor, ["x", "y"], "anchor");
    return Object.freeze({ node, anchor: Object.freeze({ x: number(anchor.x, 0, 1, "anchor.x"), y: number(anchor.y, 0, 1, "anchor.y") }) });
  }
  return Object.freeze({ node, ...(Object.hasOwn(value, "port") ? { port: choice(value.port, ["top", "right", "bottom", "left"], "port") } : {}) });
}
/** @param input - Untrusted portable graph. @returns Detached, deeply immutable and fully validated graph. */
export function readFlowchart(input: unknown): FlowchartDocument {
  const value = record(input, ["format", "version", "revision", "nodes", "edges", "page"], "document");
  if (value.format !== "quirekit-flowchart" || value.version !== 1 || !Number.isSafeInteger(value.revision)) throw new TypeError("document: unsupported format/version/revision");
  const revision = number(value.revision, 0, Number.MAX_SAFE_INTEGER - 1, "revision");
  const ids = new Set<string>();
  let totalText = 0, totalImages = 0;
  /** @param candidate - Candidate identity. @returns Newly registered identity. */
  function unique(candidate: unknown): string {
    const id = identity(candidate);
    if (ids.has(id)) throw new TypeError("id: duplicate identity");
    ids.add(id); return id;
  }
  /** @param candidate - Text candidate. @returns Checked text within document budget. */
  function boundedText(candidate: unknown): string {
    const result = text(candidate); totalText += result.length;
    if (totalText > 1e6) throw new RangeError("document: text budget exceeded");
    return result;
  }
  const nodes: FlowchartNode[] = array(value.nodes, 10000).map(candidate => {
    const n = record(candidate, ["id", "locked", "parent", "shape", "x", "y", "width", "height", "text", "style", "entity", "uml", "rotation", "flipX", "flipY", "image", "textSpans"], "node");
    if ((n.shape === "image") !== Object.hasOwn(n, "image")) throw new TypeError("image: required exclusively on image nodes");
    const image = n.shape === "image" ? readFlowchartImage(n.image) : undefined;
    totalImages += image?.dataUrl.length ?? 0;
    if (totalImages > 3e6) throw new RangeError("image: document resource budget exceeded");
    const caption = boundedText(n.text), content = readNodeContent(n, boundedText), shape = choice(n.shape, flowchartShapes, "shape");
    if (Object.hasOwn(n, "textSpans") && !canFormatFlowchartText({ shape, ...content })) throw new TypeError("textSpans: unsupported caption owner");
    return Object.freeze({ id: unique(n.id), ...lock(n), shape,
      ...(image ? { image } : {}), ...point({ x: n.x, y: n.y }), width: number(n.width, 20, 10000, "width"), height: number(n.height, 20, 10000, "height"),
      ...readFlowchartTransform(n, shape), ...content, text: caption, ...(Object.hasOwn(n, "textSpans") ? { textSpans: readFlowchartTextSpans(n.textSpans, caption) } : {}), style: readStyle(n.style, false), ...(Object.hasOwn(n, "parent") ? { parent: identity(n.parent) } : {}) });
  });
  validateHierarchy(nodes);
  const nodeIds = new Set(ids);
  const edges: FlowchartEdge[] = array(value.edges, 10000 - nodes.length).map(candidate => {
    const e = record(candidate, ["id", "locked", "source", "target", "vertices", "routing", "connector", "crossing", "label", "labelPosition", "labelOffset", "style"], "edge");
    if (e.connector === "smooth" && e.crossing !== undefined && e.crossing !== "none") throw new TypeError("crossing: smooth curves are unsupported");
    return Object.freeze({ id: unique(e.id), ...lock(e), source: terminal(e.source, nodeIds), target: terminal(e.target, nodeIds),
      vertices: Object.freeze(array(e.vertices, 256).map(point)), routing: choice(e.routing, ["orthogonal", "straight"], "routing"),
      ...(Object.hasOwn(e, "connector") ? { connector: choice(e.connector, ["sharp", "rounded", "smooth"], "connector") } : {}),
      ...(Object.hasOwn(e, "crossing") ? { crossing: choice(e.crossing, ["none", "jump", "gap"], "crossing") } : {}),
      ...(Object.hasOwn(e, "labelOffset") ? { labelOffset: typeof e.labelOffset === "number" ? number(e.labelOffset, -1e6, 1e6, "labelOffset") : point(e.labelOffset) } : {}),
      label: boundedText(e.label), labelPosition: number(e.labelPosition, 0, 1, "labelPosition"), style: readStyle(e.style, true) });
  });
  return Object.freeze({ format: "quirekit-flowchart", version: 1, revision, ...(Object.hasOwn(value, "page") ? { page: readFlowchartPageSettings(value.page) } : {}), nodes: Object.freeze(nodes), edges: Object.freeze(edges) });
}
/** @param source - JSON text. @returns Validated immutable graph. */
export function parseFlowchart(source: string): FlowchartDocument {
  if (source.length > 4e6) throw new RangeError("document: JSON budget exceeded");
  return readFlowchart(JSON.parse(source));
}
/** @param document - Canonical graph. @returns Stable lossless JSON. */
export function serializeFlowchart(document: FlowchartDocument): string {
  const source = JSON.stringify(readFlowchart(document));
  if (source.length > 4e6) throw new RangeError("document: JSON budget exceeded");
  return source;
}

/** @param input - Strict admitted object. @returns Optional checked lock without inventing a default field. */
function lock(input: Record<string, unknown>): { readonly locked?: boolean } {
  if (!Object.hasOwn(input, "locked")) return {};
  if (typeof input.locked !== "boolean") throw new TypeError("locked: expected boolean");
  return { locked: input.locked };
}
