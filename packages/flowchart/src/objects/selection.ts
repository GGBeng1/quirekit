import type { FlowchartDocument } from "../model/types";

/** @param document - Valid graph. @param ids - Direct edit targets. Rejects locks including inherited ownership. */
export function assertFlowchartUnlocked(document: FlowchartDocument, ids: readonly string[]): void {
  const cells = new Map([...document.nodes, ...document.edges].map(cell => [cell.id, cell]));
  for (const id of ids) {
    let cell = cells.get(id);
    while (cell) {
      if (cell.locked) throw new Error("选中对象已锁定，请先解锁");
      cell = "parent" in cell && cell.parent ? cells.get(cell.parent) : undefined;
    }
  }
}
/** @param document - Valid graph. @param ids - Selected roots. @returns Selected nodes and descendants plus their internal connections. */
export function objectMembers(document: FlowchartDocument, ids: readonly string[]): Set<string> {
  const selected = new Set(ids), nodes = new Map(document.nodes.map(node => [node.id, node]));
  const members = new Set(ids);
  for (const node of document.nodes) {
    let current: typeof node | undefined = node;
    while (current) { if (selected.has(current.id)) { members.add(node.id); break; } current = current.parent ? nodes.get(current.parent) : undefined; }
  }
  for (const edge of document.edges) if ("node" in edge.source && "node" in edge.target && members.has(edge.source.node) && members.has(edge.target.node)) members.add(edge.id);
  return members;
}
