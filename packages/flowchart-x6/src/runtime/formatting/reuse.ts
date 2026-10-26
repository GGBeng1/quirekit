import { applyFlowchartFormat, copyFlowchartFormat, type FlowchartFormat } from "@quirekit/flowchart";
import type { Cell } from "@antv/x6";
import type { FlowchartEditor } from "../../types";
import type { FlowRuntime, FlowTextInput } from "../types";
import { requireIdle } from "../commands";
import { requireAuthoring } from "../structure/permissions";
import { readNode, readEdge } from "../../codec/read";

/** @param runtime - Instance and input lifetime. @param text - Native editing owner. @returns Session-local format commands and pointer ownership cleanup. */
export function createFormatReuse(runtime: FlowRuntime, text: FlowTextInput) {
  const { graph, mount } = runtime;
  let format: FlowchartFormat | undefined, painting = false, consumeClick = false;
  /** Ends only the one-shot tool, keeping the copied appearance available for paste. */
  function cancel(): void { if (!painting) return; painting = false; delete mount.dataset.formatPainter; runtime.notify(); }
  /** @returns Small session state without source reads. */
  function state() { return { formatKind: format?.kind ?? null, paintingFormat: painting }; }
  /** @param ids - Direct compatible target IDs. */
  function apply(ids: readonly string[]): void {
    requireAuthoring(runtime);
    requireIdle(runtime, text);
    if (!format) throw new Error("请先复制格式");
    // Include only targets and their parent chain. Formatting does not change
    // geometry or attachments, so unrelated nodes and incident edges are not read.
    const cells = new Map<string, Cell>();
    for (const id of ids) { let cell: Cell | null = graph.getCellById(id); if (!cell) throw new Error("图形已不存在");
      while (cell && !cells.has(cell.id)) { cells.set(cell.id, cell); cell = cell.getParent(); } }
    const before = { ...runtime.options.document, nodes: [...cells.values()].filter(c => c.isNode()).map(readNode), edges: [...cells.values()].filter(c => c.isEdge()).map(readEdge) };
    const after = applyFlowchartFormat(before, ids, format);
    graph.batchUpdate("paste-format", () => {
      after.nodes.forEach((node, i) => { if (before.nodes[i] !== node) graph.getCellById(node.id).setData({ source: node }, { overwrite: true }); });
      after.edges.forEach((edge, i) => { if (before.edges[i] !== edge) graph.getCellById(edge.id).setData({ source: edge }, { overwrite: true }); });
    });
  }
  const commands: Pick<FlowchartEditor, "copyFormat" | "pasteFormat" | "setFormatPainter"> = {
    /** Captures only one source; reading is allowed under read-only permission. */
    copyFormat() {
      requireIdle(runtime, text); const selected = graph.getSelectedCells();
      if (selected.length !== 1) throw new Error("请选择一个图形或一条连线");
      const cell = selected[0]!;
      format = copyFlowchartFormat({ ...runtime.options.document, nodes: cell.isNode() ? [readNode(cell)] : [], edges: cell.isEdge() ? [readEdge(cell)] : [] }, cell.id); runtime.notify();
    },
    /** Applies the copied presentation to the exact current selection in one undo entry. */
    pasteFormat() { cancel(); apply(graph.getSelectedCells().map(c => c.id)); },
    /** @param enabled - Start one-shot painting from selection, or cancel. */
    setFormatPainter(enabled) {
      if (!enabled) { cancel(); return; }
      requireAuthoring(runtime);
      commands.copyFormat(); painting = true; mount.dataset.formatPainter = ""; mount.focus({ preventScroll: true }); runtime.notify();
    },
  };
  /** @param event - Capture before X6 can begin a selection, port drag or node drag. */
  function down(event: PointerEvent): void {
    consumeClick = false;
    if (!painting || event.button !== 0) return;
    if ((event.target as Element).closest("textarea,input,[contenteditable]")) { cancel(); return; }
    event.preventDefault(); event.stopImmediatePropagation(); consumeClick = true;
    const id = (event.target as Element).closest("[data-cell-id]")?.getAttribute("data-cell-id");
    cancel();
    if (id) try { apply([id]); graph.resetSelection(id); } catch (error) { runtime.fail(error); }
  }
  /** @param event - Compatibility mouse event following the captured pointer. */
  function suppress(event: MouseEvent): void { if (consumeClick) { event.preventDefault(); event.stopImmediatePropagation(); if (event.type === "click") consumeClick = false; } }
  /** @param event - Native Escape cancels without entering document history. */
  function key(event: KeyboardEvent): void { if (painting && event.key === "Escape" && !event.isComposing) { event.preventDefault(); event.stopImmediatePropagation(); cancel(); } }
  /** @param event - A real content mutation invalidates unfinished tool ownership. */
  function changed(event: { options: { qkDerived?: boolean } }): void { if (!event.options.qkDerived) cancel(); }
  graph.on("cell:added", cancel); graph.on("cell:removed", cancel); graph.on("cell:change:*", changed);
  mount.addEventListener("pointerdown", down, true); mount.addEventListener("mousedown", suppress, true); mount.addEventListener("click", suppress, true); mount.addEventListener("keydown", key, true);
  return { commands, state, cancel,
    /** Releases pointer capture hooks and discards the session format. */
    destroy(): void {
      painting = false; format = undefined; delete mount.dataset.formatPainter;
      graph.off("cell:added", cancel); graph.off("cell:removed", cancel); graph.off("cell:change:*", changed);
      mount.removeEventListener("pointerdown", down, true); mount.removeEventListener("mousedown", suppress, true); mount.removeEventListener("click", suppress, true); mount.removeEventListener("keydown", key, true);
    },
  };
}
