import { flowEditorText } from "../locale/resolve";
import { serializeFlowchart } from "@quirekit/flowchart";
import type { FlowchartEditor } from "@quirekit/flowchart-x6";
/** @param editor - Live controller. @param format - Output format. @param locale - Download filename language. @returns Completion of preparing and starting a browser download. */
export async function downloadFlowchart(editor: FlowchartEditor, format: "json" | "svg" | "png", locale = "zh-CN"): Promise<void> {
  const data = format === "json" ? serializeFlowchart(await editor.getDocument()) : format === "svg" ? (await editor.exportSvg()).svg : await editor.exportPng();
  const blob = format === "png" ? await (await fetch(data)).blob() : new Blob([data], { type: format === "json" ? "application/json" : "image/svg+xml" });
  downloadFlowBlob(blob, format, locale);
}
/** @param blob - Completed explicit download. @param format - Output extension. @param locale - Download filename language. */
export function downloadFlowBlob(blob: Blob, format: "json" | "svg" | "png" | "html" | "pdf", locale = "zh-CN"): void {
  const url = URL.createObjectURL(blob), link = document.createElement("a");
  link.href = url; link.download = `${flowEditorText(locale, "流程图")}.${format}`; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
}
