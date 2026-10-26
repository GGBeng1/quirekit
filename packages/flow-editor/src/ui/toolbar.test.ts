import { expect, it } from "vitest";
import { flowFileItems } from "./toolbar/files";
import { flowAlignmentRows } from "./arrange";
import { quireIconRegistry } from "@quirekit/ui";
import { flowEditorToolbar, flowViewportToolbar } from "./toolbar";
import type { FlowchartEditorState } from "@quirekit/flowchart-x6";
const state: FlowchartEditorState = { presenting: false, formatKind: null, paintingFormat: false, selectionLocked: false, selectedIds: ["n"], selectedKind: "node", selectedShapes: ["process"], selectedStyle: { fontSize: null, bold: null, textAlign: null, verticalAlign: null, padding: null, nodeCount: 1, edgeCount: 0, fill: null, stroke: null, color: null,
    width: null, dashed: null, routing: null, connector: null, crossing: null, sourceArrow: null, targetArrow: null }, readOnly: false, composing: false, canUndo: true, canRedo: false, scale: 1, x: 0, y: 0 };
it("uses registered public icons and prevents authoring under read-only/IME", () => {
  for (const item of [...flowEditorToolbar(state, true), ...flowViewportToolbar(state, true), ...flowFileItems(state), ...flowAlignmentRows(state).flatMap(row => row.items)]) if (item.icon) expect(quireIconRegistry.has(item.icon as string), String(item.icon)).toBe(true);
  for (const locked of [{ ...state, composing: true }, { ...state, readOnly: true }]) {
    if (locked.readOnly) {
      const files = flowFileItems(locked);
      expect(files.filter(item => ["templates", "template-blank"].includes(item.value)).every(item => item.disabled)).toBe(true);
      expect(files.find(item => item.value === "export-svg")?.disabled).not.toBe(true);
    }
    expect(flowEditorToolbar(locked, true).filter(i => ["undo", "fill", "object", "structure", "alignment"].includes(i.value)).every(i => i.disabled)).toBe(true);
  }
});
