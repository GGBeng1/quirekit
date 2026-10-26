import type { FlowchartDocument, FlowchartNode, FlowchartPoint, FlowchartShape, FlowchartTerminal } from "./types";
import { readFlowchart } from "./document";
import { identity } from "./validation";

/** @returns A new empty portable graph. */
export function createFlowchart(): FlowchartDocument {
  return readFlowchart({ format: "quirekit-flowchart", version: 1, revision: 0, nodes: [], edges: [] });
}
/** @param id - Stable identity. @param shape - Shape kind. @param position - World coordinates. @param text - Literal caption. @returns Validated shape defaults. */
export function createFlowchartNode(id: string, shape: FlowchartShape, position: FlowchartPoint, text: string): FlowchartNode {
  const square = ["circle", "triangle", "right-triangle", "pentagon", "octagon", "star", "plus", "summing-junction", "or-junction"].includes(shape);
  const vertical = ["arrow-up", "arrow-down", "arrow-vertical"].includes(shape);
  const structural = shape === "uml-class" ? [280, 200] : shape === "er-entity" ? [280, 160] : shape === "container" ? [800, 480] : shape === "lane-horizontal" ? [800, 220] : shape === "lane-vertical" ? [280, 650]
    : shape === "lifeline" || shape === "actor-lifeline" ? [160, 560] : shape === "activation" ? [20, 120]
      : shape.startsWith("sequence-") ? [600, 280] : shape === "destruction" ? [24, 24]
        : shape === "actor" || shape === "mobile" ? [100, 140] : shape === "server" ? [140, 120]
          : ["bracket-left", "bracket-right", "brace"].includes(shape) ? [80, 160]
            : shape === "phase-vertical" ? [120, 440] : shape === "phase-horizontal" ? [600, 48]
              : ["browser", "component", "package", "queue"].includes(shape) ? [180, 100] : undefined;
  return readFlowchart({ ...createFlowchart(), nodes: [{ id, shape, ...position, width: structural?.[0] ?? (vertical ? 80 : square ? 100 : 160),
    height: structural?.[1] ?? (vertical ? 140 : square || ["decision", "cloud", "database", "off-page", "callout", "sort", "merge"].includes(shape) ? 100 : 64), text, ...(shape === "uml-class" ? { uml: { attributes: ["- id: string"], operations: ["+ execute(): void"] } } : {}), ...(shape === "er-entity" ? { entity: { fields: [{ name: "id", type: "uuid", key: "primary" }] } } : {}), style: {} }] }).nodes[0]!;
}
/** @param document - Template or copied graph. @param prefix - Unique host-provided identity prefix. @returns New graph with every identity and internal reference remapped. */
export function instantiateFlowchart(document: FlowchartDocument, prefix: string): FlowchartDocument {
  identity(prefix);
  const source = readFlowchart(document);
  const ids = new Map(source.nodes.map((n, i) => [n.id, `${prefix}-n${i}`]));
  /** @param value - Existing attachment. @returns Remapped attachment. */
  function remap(value: FlowchartTerminal): FlowchartTerminal {
    return "node" in value ? { ...value, node: ids.get(value.node)! } : value;
  }
  return readFlowchart({ ...source, revision: 0, nodes: source.nodes.map(n => ({ ...n, id: ids.get(n.id)!, ...(n.parent ? { parent: ids.get(n.parent)! } : {}) })),
    edges: source.edges.map((e, i) => ({ ...e, id: `${prefix}-e${i}`, source: remap(e.source), target: remap(e.target) })) });
}
