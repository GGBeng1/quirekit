import { mindEditorTranslator } from "../locale/resolve";
import type { MindEditorTranslate } from "../locale/types";
import { parseMindMap, serializeMindMap } from "@quirekit/mind-map";
import type { MindMapEditor } from "@quirekit/mind-map-simple";
import { rasterizeMindMap } from "../runtime/raster";
import type { MindEditorImportReport } from "./files/types";

/** @param editor - Active editor. @param format - Explicit user-selected format. @param background - Current theme surface.
 * @param t - Scoped translator for an empty-title filename.
 * @returns Download preparation completion, using one exact source snapshot. */
export async function downloadMindMap(editor: MindMapEditor, format: "json" | "svg" | "png" | "xmind" | "markdown" | "outline" | "pdf", background: string, t: MindEditorTranslate = mindEditorTranslator()): Promise<MindEditorImportReport | null> {
  const snapshot = ["json", "xmind", "markdown", "outline"].includes(format) ? null : await editor.exportSvg();
  const source = snapshot ? parseMindMap(snapshot.source) : await editor.getDocument();
  const name = `${source.root.text.replace(/[\\/:*?"<>|\r\n]/g, "_").slice(0, 80) || t("mindMap")}.${format === "markdown" ? "md" : format === "outline" ? "txt" : format}`;
  let blob: Blob, report: MindEditorImportReport | null = null;
  if (format === "pdf") {
    blob = new Blob([new Uint8Array(await (await import("../runtime/printing/pdf")).exportMindMapPdf(snapshot!, document))], { type: "application/pdf" });
  } else if (format === "markdown" || format === "outline") {
    const result = (await import("@quirekit/mind-map/text")).exportMindMapText(source, format);
    blob = new Blob([result.text], { type: format === "markdown" ? "text/markdown;charset=utf-8" : "text/plain;charset=utf-8" });
    if (result.diagnostics.length) report = { operation: "export", name, title: source.root.text, diagnostics: result.diagnostics };
  } else if (format === "xmind") {
    const result = await (await import("@quirekit/mind-map/xmind")).exportXmindFile(source);
    blob = new Blob([new Uint8Array(result.bytes)], { type: "application/octet-stream" });
    if (result.diagnostics.length) report = { operation: "export", name, title: source.root.text, diagnostics: result.diagnostics };
  } else if (format === "png") {
    const raster = await rasterizeMindMap(snapshot!, document, background);
    blob = new Blob([Uint8Array.from(atob(raster.dataUrl.split(",")[1]!), character => character.charCodeAt(0))], { type: "image/png" });
  } else {
    blob = new Blob([snapshot?.svg ?? serializeMindMap(source)], {
      type: format === "json" ? "application/json;charset=utf-8" : "image/svg+xml;charset=utf-8",
    });
  }
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = name;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 0);
  return report;
}
