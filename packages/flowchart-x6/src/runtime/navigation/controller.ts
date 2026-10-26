import { flowchartNodeBounds } from "@quirekit/flowchart";
import type { FlowchartEditor } from "../../types";
import type { FlowRuntime, FlowTextInput } from "../types";
import { readNode } from "../../codec/read";
import { requireIdle } from "../commands";
import { searchNodes, subscribeSearch } from "./search";
import { mountOverview } from "./overview";

/** @param runtime - Viewport and lifetime owner. @param text - Native text ownership guard. @returns Navigation commands and disposal of all external subscriptions. */
export function createNavigation(runtime: FlowRuntime, text: FlowTextInput) {
  const { graph } = runtime, subscriptions = new Set<() => void>();
  /** Rejects stale consumers without committing text for passive observers. */
  function alive(): void { if (runtime.destroyed) throw new Error("流程图编辑器已关闭"); }
  /** @param cleanup - One active resource. @returns Idempotent caller cleanup, also tracked by editor lifetime. */
  function track(cleanup: () => void): () => void {
    /** Removes this registration before releasing its resources. */
    function stop(): void { if (subscriptions.delete(stop)) cleanup(); }
    subscriptions.add(stop); return stop;
  }
  const commands: Pick<FlowchartEditor, "fitSelection" | "searchNodes" | "subscribeSearch" | "locateNode" | "mountOverview"> = {
    /** Fits actual world bounds of the selection, including routed edge geometry. */
    fitSelection() {
      requireIdle(runtime, text); const cells = graph.getSelectedCells(); if (!cells.length) return;
      const bounds = cells.map(cell => {
        if (cell.isNode()) return flowchartNodeBounds(readNode(cell));
        const view = graph.findViewByCell(cell);
        // Vendor view bounds include viewport transforms. Invert them once so
        // selection fit consumes the same world coordinates as portable nodes.
        return view ? graph.graphToLocal(view.getBBox()) : cell.getBBox();
      });
      const x = Math.min(...bounds.map(b => b.x)), y = Math.min(...bounds.map(b => b.y));
      graph.zoomToRect({ x, y, width: Math.max(1, Math.max(...bounds.map(b => b.x + b.width)) - x), height: Math.max(1, Math.max(...bounds.map(b => b.y + b.height)) - y) }, { padding: 64, maxScale: 1, minScale: 0.1 });
    },
    /** @param query - Literal displayed text. @param limit - Bounded row count. @returns Current matching nodes. */
    searchNodes(query, limit) { alive(); return searchNodes(graph, query, limit, runtime.locale); },
    /** @param listener - Semantic search invalidation callback. @returns Lifetime-safe unsubscribe. */
    subscribeSearch(listener) { alive(); return track(subscribeSearch(graph, listener)); },
    /** @param id - Revalidated current node. */
    locateNode(id) {
      requireIdle(runtime, text); const node = graph.getCellById(id);
      if (!node?.isNode()) throw new Error("该图形已不存在，请重新查找");
      const bounds = flowchartNodeBounds(readNode(node)); graph.resetSelection(id);
      graph.zoomToRect(bounds, { padding: 80, maxScale: 1, minScale: 0.1 });
    },
    /** @param container - Dedicated overview host. @returns Lifetime-safe cleanup. */
    mountOverview(container) { alive(); return track(mountOverview(runtime, text, container)); },
  };
  return { commands, /** Releases observers before the underlying graph is disposed. */ destroy(): void { [...subscriptions].forEach(stop => stop()); } };
}
