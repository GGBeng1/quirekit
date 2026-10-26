import { bindKeyboard } from "./input/keyboard";
import { bindContext } from "./input/context";
import type { Transform, Node } from "@antv/x6";
import { syncSelectionPermission, outerGroup } from "./structure/permissions";
import { presentLayer } from "./structure/layers";
import type { FlowchartEditor } from "../types";
import type { FlowRuntime, FlowTextInput } from "./types";
import { presentCell, presentEdgeTools } from "./presentation";

/** @param runtime - Graph and host callback ownership. @param text - Native input. @param controller - Commands. @returns Native event cleanup. */
export function bindEvents(runtime: FlowRuntime, text: FlowTextInput, controller: FlowchartEditor): () => void {
  const { graph, mount } = runtime, pendingLayers = new Set<Node>();
  /** Reports a content mutation without enumerating/serializing the graph. */
  function changed(): void { runtime.changes++; runtime.options.onChange?.(runtime.changes); runtime.notify(); }
  graph.on("cell:added", changed); graph.on("cell:removed", changed);
  graph.on("cell:change:*", ({ cell, key, options }) => {
    if (options.qkDerived || !["angle", "position", "size", "data", "source", "target", "vertices", "labels", "parent", "children", "qkOrder", "zIndex"].includes(String(key))) return;
    // Rotation is the native cell transform; only content/size changes require
    // measuring local caption runs or rebuilding local shape geometry.
    if (key === "data" || key === "size") presentCell(cell, runtime, key === "data");
    if (key === "qkOrder" && cell.isNode()) pendingLayers.add(cell);
    if (key === "data" || key === "parent") { syncSelectionPermission(runtime); graph.getPlugin<Transform>("transform")?.clearWidgets(); }
    changed();
  });
  graph.on("node:click", ({ cell, e }) => {
    const group = outerGroup(cell);
    if (group !== cell && !e.ctrlKey && !e.metaKey && !e.shiftKey) graph.resetSelection(group);
  });
  graph.on("selection:changed", ({ added, removed }) => {
    syncSelectionPermission(runtime);
    removed.forEach(cell => { if (cell.isEdge()) cell.removeTools({ qkDerived: true }); });
    if (!runtime.readOnly) added.forEach(cell => {
      if (cell.isEdge()) presentEdgeTools(cell, runtime);
    });
    runtime.notify();
  });
  graph.on("history:change", () => {
    // Let History capture the previous canonical order before derived zIndex
    // writes update the vendor property store's previous-value snapshot.
    for (const node of pendingLayers) if (graph.hasCell(node)) presentLayer(node);
    pendingLayers.clear(); runtime.notify();
  }); graph.on("scale", runtime.notify); graph.on("translate", runtime.notify);
  graph.on("cell:dblclick", ({ cell }) => { try { text.open(cell.id); } catch (error) { runtime.fail(error); } });
  graph.on("blank:click", () => { try { text.commit(); } catch (error) { runtime.fail(error); } });
  const removeKeyboard = bindKeyboard(runtime, text, controller), removeContext = bindContext(runtime, text);
  /** @param event - Pointer entering graph interaction. */
  function down(event: PointerEvent): void {
    if ((event.target as HTMLElement).closest("textarea")) return;
    if (text.isComposing() || runtime.exporting) { event.preventDefault(); event.stopImmediatePropagation(); return; }
    try { text.commit(); } catch (error) { runtime.fail(error); event.stopImmediatePropagation(); return; }
    runtime.dragging = event.button !== 2; mount.focus({ preventScroll: true });
  }
  /** Ends an instance-owned gesture even when pointer release is outside the mount. */
  function up(): void { runtime.dragging = false; }
  /** @param event - Double click on the native selection overlay, which intercepts the SVG cell hit. */
  function editSelected(event: MouseEvent): void {
    const box = (event.target as Element).closest<HTMLElement>(".x6-widget-selection-box[data-cell-id]");
    if (!box || !mount.contains(box)) return;
    const id = box.dataset.cellId;
    if (id) try { text.open(id); } catch (error) { runtime.fail(error); }
  }
  mount.addEventListener("pointerdown", down, true);
  mount.addEventListener("dblclick", editSelected);
  mount.ownerDocument.addEventListener("pointerup", up); mount.ownerDocument.addEventListener("pointercancel", up);
  return () => {
    removeKeyboard(); removeContext(); mount.removeEventListener("pointerdown", down, true);
    mount.removeEventListener("dblclick", editSelected);
    mount.ownerDocument.removeEventListener("pointerup", up); mount.ownerDocument.removeEventListener("pointercancel", up);
  };
}
