import type { FlowchartDocument } from "../../model/types";

/** @param document - Latest accepted scene. @param fallback - Authored graph lookup before any scene exists. @returns Exact lookup for the current diagram, excluding retired IDs. */
export function sceneTargets(document: FlowchartDocument | undefined, fallback: (id: string, kind?: "edge") => boolean): (id: string, kind?: "edge") => boolean {
  if (!document) return fallback;
  const nodes = new Set(document.nodes.map(node => node.id)), edges = new Set(document.edges.map(edge => edge.id));
  return (id, kind) => kind === "edge" ? edges.has(id) : nodes.has(id) || edges.has(id);
}
