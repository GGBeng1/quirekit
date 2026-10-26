import type { Graph } from "@antv/x6";
import type { FlowchartPageSettings } from "@quirekit/flowchart";

const pages = new WeakMap<Graph, FlowchartPageSettings>();
/** @param graph - Exact runtime owner. @returns Optional canonical root metadata, never a hidden graph cell. */
export function readGraphPage(graph: Graph): FlowchartPageSettings | undefined { return pages.get(graph); }
/** @param graph - Exact runtime owner. @param page - Admitted metadata, or absent legacy settings. */
export function writeGraphPage(graph: Graph, page: FlowchartPageSettings | undefined): void { if (page) pages.set(graph, page); else pages.delete(graph); }
