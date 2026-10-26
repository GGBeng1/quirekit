import { flowRuntimeText } from "../locale/messages";
import type { Cell, Graph } from "@antv/x6";
import type { FlowchartNode } from "@quirekit/flowchart";
import type { FlowchartSearchResult } from "../../navigation/types";
/** @param source - Canonical display content. @returns Searchable title and structured member text, never hidden IDs or style metadata. */
export function searchableNodeText(source: FlowchartNode): string {
  return [source.text, ...(source.entity?.fields.map(f => `${f.name} ${f.type}`) ?? []), ...(source.uml?.attributes ?? []), ...(source.uml?.operations ?? [])].join("\n");
}
/** @param graph - Current graph, read only on explicit query or semantic invalidation. @param query - Literal case-insensitive text. @param limit - Visible list cap. @param locale - Fallback label language. @returns Exact total and bounded result rows. */
export function searchNodes(graph: Graph, query: string, limit = 50, locale = "zh-CN"): FlowchartSearchResult {
  if (typeof query !== "string" || query.length > 1000 || !Number.isInteger(limit) || limit < 1 || limit > 200) throw new TypeError("无效图形搜索");
  const term = query.trim().toLocaleLowerCase(), items: FlowchartSearchResult["items"][number][] = []; let total = 0;
  if (!term) return { total, items };
  for (const cell of graph.getNodes()) {
    const source = cell.getData<{ source: FlowchartNode }>().source, text = searchableNodeText(source);
    const match = text.toLocaleLowerCase().indexOf(term); if (match < 0) continue;
    total++; if (items.length < limit) items.push({ id: cell.id, shape: source.shape, title: source.text || flowRuntimeText(locale, "未命名图形"), preview: text.slice(Math.max(0, match - 20), match + 100).replace(/\n/g, " · ") });
  }
  return { total, items };
}
/** @param graph - Live graph. @param listener - Callback after relevant content, coalesced at native batch boundaries. @returns Complete subscription cleanup. */
export function subscribeSearch(graph: Graph, listener: () => void): () => void {
  const labels = new Map(graph.getNodes().map(n => [n.id, searchableNodeText(n.getData<{ source: FlowchartNode }>().source)]));
  let pending = false;
  /** Publishes only after the canonical batch ends, without timer/debounce or pointer work. */
  function flush(): void { if (pending && !graph.model.hasActiveBatch()) { pending = false; listener(); } }
  /** @param event - One possibly renamed or newly inserted node. */
  function update({ cell }: { cell: Cell }): void {
    if (!cell.isNode()) return;
    const label = searchableNodeText(cell.getData<{ source: FlowchartNode }>().source);
    if (labels.get(cell.id) === label) return;
    labels.set(cell.id, label); pending = true; flush();
  }
  /** @param event - Removed node; edges do not affect this title/member search. */
  function remove({ cell }: { cell: Cell }): void { if (labels.delete(cell.id)) { pending = true; flush(); } }
  graph.on("node:change:data", update); graph.on("cell:added", update); graph.on("cell:removed", remove); graph.on("batch:stop", flush);
  return () => { labels.clear(); graph.off("node:change:data", update); graph.off("cell:added", update); graph.off("cell:removed", remove); graph.off("batch:stop", flush); };
}
