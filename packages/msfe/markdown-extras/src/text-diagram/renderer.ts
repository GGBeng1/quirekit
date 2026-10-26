import type { ComponentViewRenderer } from "@quirekit/msfe-core";
import { renderTextDiagram } from "@quirekit/text-diagram/browser";
import type { PreviewActivation, PreviewOptions, PreviewProps } from "../shared/types";
import { previewRenderer } from "../shared/preview";
import { textDiagramPreviewCache } from "./cache";
/** @param controls - Optional host-owned source actions. @param activation - Editing gesture. @returns Shared local PlantUML/DOT rendering with source fallback. */
export function createTextDiagramRenderer(controls: PreviewOptions["controls"], activation?: PreviewActivation): ComponentViewRenderer<PreviewProps> {
  return previewRenderer(async (props, signal, typography, ownerDocument) => (await renderTextDiagram(props.language ?? "mermaid", props.text, { signal, typography, ownerDocument })).svg, controls,
    { loadingSource: false, cache: textDiagramPreviewCache, ...(activation ? { activation } : {}) });
}
