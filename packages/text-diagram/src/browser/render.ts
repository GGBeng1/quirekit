import type { TextDiagramLanguage, TextDiagramSnapshot, TextDiagramRaster } from "../types";
import type { TextDiagramRenderOptions } from "./types";
import { renderIsolated } from "./isolated";
import { renderMermaid } from "./mermaid";
import { sanitizeTextDiagram } from "./sanitize";

/** @param language - Explicit grammar. @param source - Exact draft. @param options - Cancellable render owner.
 * @returns A static SVG snapshot tied to exactly this source. */
export async function renderTextDiagram(language: TextDiagramLanguage, source: string, options: TextDiagramRenderOptions): Promise<TextDiagramSnapshot> {
  options.signal.throwIfAborted();
  if (!source.trim() || source.length > 30_000) throw new RangeError("diagram-source-budget");
  if (!["mermaid", "plantuml", "dot"].includes(language)) throw new TypeError("diagram-language-invalid");
  const owner = options.ownerDocument ?? document;
  const svg = language === "mermaid" ? await renderMermaid(source, options.signal, options.typography ?? { fontFamily: "Arial, sans-serif", fontSize: 16 })
    : await renderIsolated(language, source, owner, options.signal);
  options.signal.throwIfAborted();
  return Object.freeze({ language, source, ...sanitizeTextDiagram(svg, owner) });
}
/** @param snapshot - Already sanitized, source-bound SVG. @param owner - Canvas owner. @param signal - Save lifetime.
 * @returns A bounded PNG from this snapshot, without rereading the draft. */
export async function rasterizeTextDiagram(snapshot: TextDiagramSnapshot, owner: Document, signal: AbortSignal): Promise<TextDiagramRaster> {
  signal.throwIfAborted();
  const scale = Math.min(2, 4096 / snapshot.width, 4096 / snapshot.height, Math.sqrt(8e6 / (snapshot.width * snapshot.height)));
  const width = Math.max(1, Math.floor(snapshot.width * scale)), height = Math.max(1, Math.floor(snapshot.height * scale));
  const view = owner.defaultView!, image = new view.Image();
  const url = view.URL.createObjectURL(new Blob([snapshot.svg], { type: "image/svg+xml" }));
  try {
    image.src = url; await image.decode(); signal.throwIfAborted();
    const canvas = owner.createElement("canvas"); canvas.width = width; canvas.height = height;
    const context = canvas.getContext("2d"); if (!context) throw new Error("diagram-raster-unavailable");
    context.fillStyle = "white"; context.fillRect(0, 0, width, height); context.drawImage(image, 0, 0, width, height);
    return Object.freeze({ language: snapshot.language, source: snapshot.source, width, height, dataUrl: canvas.toDataURL("image/png") });
  } finally { view.URL.revokeObjectURL(url); }
}
