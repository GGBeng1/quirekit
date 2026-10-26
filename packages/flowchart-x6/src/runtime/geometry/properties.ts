import { canSetFlowchartGeometry, setFlowchartGeometry, replaceFlowchartShapes, type FlowchartGeometryField } from "@quirekit/flowchart";
import type { FlowchartEditor, FlowchartGeometrySelection } from "../../types";
import type { FlowRuntime, FlowTextInput } from "../types";
import { readNode } from "../../codec/read";
import { readGeometrySelection } from "./selection";
import { requireAuthoring } from "../structure/permissions";
import { v4 as uuidv4 } from "uuid";

/** @param runtime - Isolated graph. @param text - Native text ownership. @returns On-demand geometry snapshots and guarded atomic updates. */
export function createGeometryCommands(runtime: FlowRuntime, text: FlowTextInput): Pick<FlowchartEditor, "getGeometry" | "setGeometry" | "replaceShape"> {
  const { graph } = runtime, identity = uuidv4();
  /** @returns Instance, document mutation and exact selection token without source reads. */
  function token(): string { return `${identity}:${runtime.changes}:${JSON.stringify(graph.getSelectedCells().map(c => c.id))}`; }
  /** Rejects transient owners before committing a pending text draft. */
  function idle(): void {
    if (runtime.destroyed || runtime.exporting || runtime.dragging) throw new Error("请完成当前操作后重试");
    text.commit();
  }
  return {
    /** @param shape - Ordinary replacement. @param expected - Optional opening source/selection guard. */
    replaceShape(shape, expected): void {
      requireAuthoring(runtime);
      idle(); if (expected && expected.token !== token()) throw new Error("图形或选区已变化，请重新打开属性");
      const before = readGeometrySelection(runtime), after = replaceFlowchartShapes(before, graph.getSelectedCells().map(c => c.id), shape);
      graph.batchUpdate("replace-shape", () => after.nodes.forEach((node, i) => {
        if (before.nodes[i] !== node) graph.getCellById(node.id).setData({ source: node }, { overwrite: true });
      }));
    },
    /** @returns Common root values; mixed values stay null instead of inventing zero. */
    getGeometry(): FlowchartGeometrySelection {
      idle();
      const selected = graph.getSelectedCells(), ids = new Set(selected.map(c => c.id));
      const nodes = selected.filter(c => c.isNode() && !c.getAncestors().some(parent => ids.has(parent.id))).map(c => readNode(c as import("@antv/x6").Node));
      const fields = ["x", "y", "width", "height", "rotation"] as const;
      const values = {} as Record<FlowchartGeometryField, number | null>, editable = {} as Record<FlowchartGeometryField, boolean>;
      for (const field of fields) {
        const first = nodes[0]?.[field] ?? 0;
        values[field] = nodes.length && nodes.every(n => (n[field] ?? 0) === first) ? first : null;
        editable[field] = !!nodes.length && nodes.every(n => canSetFlowchartGeometry(n.shape, field));
      }
      return { token: token(), count: nodes.length, values, editable };
    },
    /** @param patch - Only explicitly edited fields. @param expected - Opening snapshot. */
    setGeometry(patch, expected): void {
      requireAuthoring(runtime);
      idle(); if (expected.token !== token()) throw new Error("图形或选区已变化，请重新打开属性");
      const before = readGeometrySelection(runtime), after = setFlowchartGeometry(before, graph.getSelectedCells().map(c => c.id), patch);
      graph.batchUpdate("geometry", () => {
        after.nodes.forEach((node, i) => {
          const old = before.nodes[i]!, cell = graph.getCellById(node.id); if (!cell.isNode()) return;
          if (old.x !== node.x || old.y !== node.y) cell.setPosition(node.x, node.y, { deep: false });
          if (old.width !== node.width || old.height !== node.height) cell.resize(node.width, node.height);
          if (old.rotation !== node.rotation) cell.setData({ source: node }, { overwrite: true });
        });
        after.edges.forEach((edge, i) => {
          const cell = graph.getCellById(edge.id); if (cell.isEdge() && JSON.stringify(before.edges[i]!.vertices) !== JSON.stringify(edge.vertices)) cell.setVertices([...edge.vertices]);
        });
      });
    },
  };
}
