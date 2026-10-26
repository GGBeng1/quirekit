import type { FlowchartDirection, FlowchartQuickCreate, FlowchartArrow, FlowchartCrossing, FlowchartConnector, FlowchartDrawingStyle, FlowchartShape } from "@quirekit/flowchart";
import type { FlowchartCommand, FlowchartEditor } from "@quirekit/flowchart-x6";
import { downloadFlowchart } from "./download";
import { createFlowchartTemplate } from "../templates/catalog";
import type { FlowchartTemplateId } from "../templates/types";
import { flowRelations } from "./formatting/relations";
import { v4 as uuidv4 } from "uuid";

/** @param instance - Valid current controller. @param value - Toolbar or menu action. @param revision - Host base revision. @param locale - New template and download language. @returns Completion of the shared action. */
export async function executeFlowAction(instance: FlowchartEditor, value: string, revision: number, locale = "zh-CN"): Promise<void> {
  if (value === "format-copy") instance.copyFormat();
  else if (value === "format-paste") instance.pasteFormat();
  else if (value === "format-painter") instance.setFormatPainter(!instance.getState().paintingFormat);
  else if (value === "clipboard-copy" || value === "clipboard-cut") await instance.copyToClipboard(value === "clipboard-cut");
  else if (value === "clipboard-paste") await instance.pasteFromClipboard();
  else if (value.startsWith("quick-")) {
    const [, direction, ...shape] = value.split("-");
    instance.addConnectedNode({ direction: direction as FlowchartDirection, shape: shape.join("-") as FlowchartQuickCreate["shape"] });
  }
  else if (value === "fit") instance.fit();
  else if (value === "fit-selection") instance.fitSelection();
  else if (value.startsWith("zoom-")) instance.setZoom(value === "zoom-in" ? instance.getState().scale * 1.15 : value === "zoom-out" ? instance.getState().scale / 1.15 : 1);
  else if (value.startsWith("export-")) await downloadFlowchart(instance, value.slice(7) as "json" | "svg" | "png", locale);
  else if (value.startsWith("insert-")) instance.addNode(value.slice(7) as FlowchartShape);
  else if (value.startsWith("template-")) {
    const source = createFlowchartTemplate(value.slice(9) as FlowchartTemplateId, `template-${uuidv4()}`, locale);
    instance.replaceDocument({ ...source, revision }); instance.fit();
  } else if (value.startsWith("text-")) instance.setNodeStyle({ bold: value === "text-bold" });
  else if (/^size-\d+$/.test(value)) instance.setNodeStyle({ fontSize: Number(value.slice(5)) });
  else if (value.startsWith("drawing-")) instance.setDrawingStyle(value.slice(8) as FlowchartDrawingStyle);
  else if (value.startsWith("connection-")) {
    const kind = value.slice(11);
    instance.setEdgeConnection({ routing: kind === "straight" || kind === "smooth" ? "straight" : "orthogonal", connector: kind === "straight" ? "sharp" : kind as FlowchartConnector });
  } else if (value.startsWith("crossing-")) instance.setEdgeConnection({ routing: instance.getState().selectedStyle.routing ?? "straight", crossing: value.slice(9) as FlowchartCrossing });
  else if (value.startsWith("line-")) instance.setEdgeStyle({ dashed: value === "line-dashed" });
  else if (value.startsWith("weight-")) instance.setEdgeStyle({ width: Number(value.slice(7)) });
  else if (value.startsWith("relation-")) { const preset = flowRelations.find(r => r.value === value); if (preset) instance.setEdgeStyle(preset.style); }
  else if (value.startsWith("endpoint-source-")) instance.setEdgeStyle({ sourceArrow: value.slice(16) as FlowchartArrow });
  else if (value.startsWith("endpoint-target-")) instance.setEdgeStyle({ targetArrow: value.slice(16) as FlowchartArrow });
  else if (value.startsWith("arrow-")) instance.setEdgeStyle({ sourceArrow: value === "arrow-both" ? "block" : "none", targetArrow: value === "arrow-both" ? "block" : value.slice(6) as FlowchartArrow });
  else instance.execute(value as FlowchartCommand);
}
