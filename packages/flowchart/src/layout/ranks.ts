import type { FlowchartDocument, FlowchartNode } from "../model/types";
import type { LayoutScope } from "./types";

/** @param document - Canonical edges, never mutated by cycle handling. @param scope - Atomic layout roots. @returns Stable ranked rows for a bounded layered layout. */
export function layoutRanks(document: FlowchartDocument, scope: LayoutScope): FlowchartNode[][] {
  const outgoing = new Map(scope.roots.map(n => [n.id,new Set<string>()])), incoming = new Map(scope.roots.map(n => [n.id,0]));
  for (const edge of document.edges) {
    const from = "node" in edge.source ? scope.membership.get(edge.source.node) : undefined;
    const to = "node" in edge.target ? scope.membership.get(edge.target.node) : undefined;
    if (from && to && from !== to && !outgoing.get(from)!.has(to)) { outgoing.get(from)!.add(to); incoming.set(to,incoming.get(to)! + 1); }
  }
  const pending = new Set(scope.roots.map(n => n.id)), rank = new Map(scope.roots.map(n => [n.id,0]));
  // Kahn ranking has a stable cycle fallback. Only the temporary traversal cuts
  // a return dependency; source edges and their direction remain authoritative.
  while (pending.size) {
    const id = [...pending].find(id => incoming.get(id) === 0) ?? pending.values().next().value!;
    pending.delete(id);
    for (const target of outgoing.get(id)!) if (pending.has(target)) { rank.set(target,Math.max(rank.get(target)!,rank.get(id)! + 1)); incoming.set(target,incoming.get(target)! - 1); }
  }
  const rows: FlowchartNode[][] = [];
  for (const node of scope.roots) { const level = rank.get(node.id)!; (rows[level] ??= []).push(node); }
  return rows.filter(row => row.length);
}
