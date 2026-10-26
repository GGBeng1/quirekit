import { expect, it, vi } from "vitest";
import type { Node } from "@antv/x6";
import { createFlowchartNode, type FlowchartNode, type FlowchartEdge } from "@quirekit/flowchart";
import type { FlowRuntime } from "../types";
import { readGeometrySelection } from "./selection";

// Codec correctness has separate real-X6 browser coverage. Here its calls count
// the exact source objects consumed, independently of graph size or elapsed time.
vi.mock("../../codec/read", () => ({ readNode: vi.fn(cell => cell.source), readEdge: vi.fn(cell => cell.source) }));
import { readNode, readEdge } from "../../codec/read";

/** @param source - Canonical node. @returns Minimal ownership-index cell with no DOM dependency. */
function cell(source: FlowchartNode): Node {
  return { id: source.id, source, isNode: () => true, isEdge: () => false,
    getParent: () => null, getDescendants: () => [] } as unknown as Node;
}

for (const size of [100, 500, 1000]) {
  it(`reads only the affected ownership and adjacency closure among ${size} nodes`, () => {
    vi.mocked(readNode).mockClear(); vi.mocked(readEdge).mockClear();
    const nodes = Array.from({ length: size }, (_, i) => cell(createFlowchartNode(`n${i}`, "process", { x: i * 200, y: 0 }, String(i))));
    const [root, child, peer, owner] = nodes;
    Object.assign(root!, { getDescendants: () => [child!] });
    Object.assign(child!, { getParent: () => root! }); Object.assign(peer!, { getParent: () => owner! });
    const source: FlowchartEdge = { id: "edge", source: { node: child!.id }, target: { node: peer!.id }, vertices: [], routing: "straight", label: "", labelPosition: 0.5, style: {} };
    const edge = { id: source.id, source, getSourceCell: () => child!, getTargetCell: () => peer! };
    const enumerate = vi.fn(() => { throw new Error("Unbounded full-graph enumeration"); });
    const connected = vi.fn((node: { id: string }) => node.id === child!.id ? [edge] : []);
    const runtime = { graph: { getSelectedCells: () => [root!, child!], getConnectedEdges: connected,
      getNodes: enumerate, getEdges: enumerate, getCells: enumerate }, options: { document: { revision: 3 } } } as unknown as FlowRuntime;
    const result = readGeometrySelection(runtime);
    expect(result.nodes.map(n => n.id)).toEqual([root!.id, child!.id, peer!.id, owner!.id]);
    expect(result.edges).toEqual([source]); expect(result.revision).toBe(3);
    expect(readNode).toHaveBeenCalledTimes(4); expect(readEdge).toHaveBeenCalledTimes(1);
    expect(connected).toHaveBeenCalledTimes(2); expect(enumerate).not.toHaveBeenCalled();
  });
}
