import { flowRuntimeText } from "./locale/messages";
import { addConnectedNode } from "./creation/connected";
import { moveSelection } from "./geometry/move";
import { updateFlowchartContent } from "@quirekit/flowchart";
import { applyStructure } from "./structure/apply";
import { updateSelectedEdges } from "./connections/format";
import { executeConnection } from "./connections/commands";
import { requireAuthoring, requireUnlocked } from "./structure/permissions";
import { executeObject } from "./structure/objects";
import type { FlowchartObjectCommand } from "@quirekit/flowchart";
import { createFlowchartNode, readFlowchart } from "@quirekit/flowchart";
import type { FlowchartEditor } from "../types";
import { readGraph, readNode, readEdge } from "../codec/read";
import type { FlowRuntime, FlowTextInput } from "./types";
import { appendNode } from "./content";
import { duplicateStructure } from "./structure/copy";
import { executeSwimlane } from "./structure/swimlanes";
import { executeArrange } from "./structure/arrange";
import type { FlowchartArrange, FlowchartLayout, FlowchartTransform } from "@quirekit/flowchart";
import { executeSequence } from "./structure/sequence";
import { setSelectionColor } from "./formatting/color";
import { replaceFlowGraph } from "./replacement/commands";
import { v4 as uuidv4 } from "uuid";

/** @param runtime - Instance lifetime. @param text - Pending native input. */
export function requireIdle(runtime: FlowRuntime, text: FlowTextInput): void {
  if (runtime.destroyed) throw new Error("流程图编辑器已关闭");
  if (runtime.exporting || runtime.dragging || runtime.replacing) throw new Error("请完成当前操作后重试");
  text.commit();
}
/** @param runtime - Graph state. @param text - Native input. @returns Authoring and view operations. */
export function createCommands(runtime: FlowRuntime, text: FlowTextInput): Pick<FlowchartEditor,
  "addConnectedNode" | "moveSelection" | "setNodeContent" | "addNode" | "replaceDocument" | "select" | "execute" | "setNodeStyle" | "setEdgeStyle" | "setColor" | "setEdgeConnection" | "setEdgeLayout" | "setDrawingStyle" | "fit" | "setZoom" | "focus"> {
  const { graph } = runtime;
  /** Guards mutation before pending text is allowed to enter history. */
  function writable(): void {
    requireAuthoring(runtime);
    requireIdle(runtime, text);
  }
  return {
    /** @param options - Bounded connected-node creation. @returns New node identity. */
    addConnectedNode(options) { writable(); requireUnlocked(runtime); return addConnectedNode(runtime, options); },
    /** @param delta - World translation of the selected closure. */
    moveSelection(delta) { writable(); requireUnlocked(runtime); moveSelection(runtime, delta); },
    /** @param target - Independent selected color channel. @param color - Opaque HEX value. */
    setColor(target, color) { writable(); requireUnlocked(runtime); setSelectionColor(runtime, target, color); },
    /** @param source - Replacement at the unchanged host revision. */
    replaceDocument(source) {
      writable(); const checked = readFlowchart(source);
      if (checked.revision !== runtime.options.document.revision) throw new Error("流程图基准版本不可改变");
      replaceFlowGraph(runtime, checked);
    },
    /** @param shape - Admitted shape. @param position - Optional world position. @returns New stable node ID. */
    addNode(shape, position) {
      writable(); if (graph.getCellCount() >= 10000) throw new RangeError("图形数量已达上限");
      const rect = runtime.mount.getBoundingClientRect();
      const center = graph.clientToLocal(rect.x + rect.width / 2, rect.y + rect.height / 2);
      const id = `node-${uuidv4()}`;
      const label = shape === "container" ? "分层容器" : shape.startsWith("lane-") ? "职责泳道" : ["bracket-left", "bracket-right", "brace", "destruction"].includes(shape) ? "" : shape === "actor" ? "用户" : "新图形";
      const initial = createFlowchartNode(id, shape, { x: 0, y: 0 }, flowRuntimeText(runtime.locale, label));
      const node = { ...initial, ...(position ?? { x: center.x - initial.width / 2, y: center.y - initial.height / 2 }) };
      appendNode(runtime, runtime.drawing === "standard" ? node : { ...node, style: { drawing: runtime.drawing } }); graph.resetSelection(id); return id;
    },
    /** @param ids - New selection. */ select(ids) { requireIdle(runtime, text); graph.resetSelection([...ids]); },
    /** @param command - Authoring intent. */
    execute(command) {
      if (command === "select-all") { requireIdle(runtime, text); graph.resetSelection(graph.getCells()); return; }
      writable();
      if (!command.startsWith("layout-") && !["undo", "redo", "unlock", "unlock-all", "lock"].includes(command)) requireUnlocked(runtime);
      if (["group", "ungroup", "lock", "unlock", "unlock-all"].includes(command) || command.startsWith("layer-")) executeObject(runtime, command as FlowchartObjectCommand);
      else if (command === "undo") graph.undo();
      else if (command === "redo") graph.redo();
      else if (command === "delete") graph.batchUpdate("delete", () => graph.getSelectedCells().forEach(cell => { if (graph.hasCell(cell)) cell.remove(); }));
      else if (command === "duplicate") duplicateStructure(runtime);
      else if (/^(rotate-|flip-|transform-|layout-|align-|distribute-|size-)/.test(command)) executeArrange(runtime, command as FlowchartArrange | FlowchartLayout | FlowchartTransform);
      else if (command.startsWith("edge-")) executeConnection(runtime, command);
      else if (command.startsWith("swimlane-")) executeSwimlane(runtime, command);
      else if (command.startsWith("sequence-")) executeSequence(runtime, command);
      else if (command === "edit-text") { const cell = graph.getSelectedCells()[0]; if (cell) text.open(cell.id); }
      else throw new TypeError("未知流程图命令");
    },
    /** @param id - Existing target. @param content - Atomic structured content. @param expected - Optional opening snapshot. */
    setNodeContent(id, content, expected) {
      writable(); const before = readGraph(graph, runtime.options.document.revision);
      applyStructure(runtime, before, updateFlowchartContent(before, id, content, expected), graph.getSelectedCells().map(c => c.id));
    },
    /** @param style - Validated shape overrides. */
    setNodeStyle(style) {
      writable(); requireUnlocked(runtime);
      const updates = graph.getSelectedCells().filter(c => c.isNode()).map(cell => ({ cell, source: { ...readNode(cell), style: { ...readNode(cell).style, ...style } } }));
      readFlowchart({ format: "quirekit-flowchart", version: 1, revision: 0, nodes: updates.map(u => { const { parent: _parent, ...node } = u.source; return node; }), edges: [] });
      graph.batchUpdate("style", () => updates.forEach(({ cell, source }) => cell.setData({ source }, { overwrite: true })));
    },
    /** @param style - Validated connector overrides. */
    setEdgeStyle(style) {
      writable(); requireUnlocked(runtime);
      updateSelectedEdges(runtime, edge => ({ ...edge, style: { ...edge.style, ...style } }));
    },
    /** @param layout - Explicit bends or label placement. */
    setEdgeLayout(layout) { writable(); requireUnlocked(runtime); updateSelectedEdges(runtime, edge => ({ ...edge, ...layout })); },
    /** @param connection - Routing, corners and crossing treatment. */
    setEdgeConnection(connection) {
      writable(); requireUnlocked(runtime);
      updateSelectedEdges(runtime, edge => ({ ...edge, ...connection,
        ...(connection.connector === "smooth" ? { crossing: "none" } : connection.crossing && connection.crossing !== "none" && edge.connector === "smooth" ? { connector: "sharp" } : {}) }));
    },
    /** @param drawing - Persisted object preset and current insertion preference. */
    setDrawingStyle(drawing) {
      writable(); requireUnlocked(runtime, !graph.getSelectedCells().length);
      // One explicit formatting command may traverse its targets. Pointer and
      // selection events never enter this source validation or mutation phase.
      const selected = new Set(graph.getSelectedCells().map(c => c.id)), source = readGraph(graph, 0);
      const checked = readFlowchart({ ...source,
        nodes: source.nodes.map(n => !selected.size || selected.has(n.id) ? { ...n, style: { ...n.style, drawing } } : n),
        edges: source.edges.map(e => !selected.size || selected.has(e.id) ? { ...e, style: { ...e.style, drawing } } : e) });
      if (!["standard", "sketch", "pencil"].includes(drawing)) throw new TypeError("未知绘制风格");
      graph.batchUpdate("drawing", () => [...checked.nodes, ...checked.edges].filter(c => !selected.size || selected.has(c.id)).forEach(c => graph.getCellById(c.id).setData({ source: c }, { overwrite: true })));
      runtime.drawing = drawing;
    },
    /** Fits the graph within the current clipping container. */
    fit() { requireIdle(runtime, text); if (runtime.presentationFit?.()) return; if (graph.getCellCount()) graph.zoomToFit({ padding: 64, maxScale: 1, minScale: 0.1 }); },
    /** @param scale - Absolute ratio. */
    setZoom(scale) { requireIdle(runtime, text); if (!Number.isFinite(scale)) throw new TypeError("无效缩放比例"); graph.zoomTo(Math.max(0.1, Math.min(3, scale))); },
    /** Returns keyboard ownership to this surface. */ focus() { if (!runtime.destroyed) runtime.mount.focus({ preventScroll: true }); },
  };
}
