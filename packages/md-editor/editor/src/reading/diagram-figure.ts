import { h, type VNode } from "vue";

/** Saved raster carried by a graphical diagram envelope. */
export interface DiagramFigurePreview {
  /** PNG data URL saved by the graphical editor; absent when the host stored the image. */
  dataUrl?: string | undefined;
  /** Address of the PNG stored by the host. */
  url?: string | undefined;
  /** Raster width in pixels. */
  width: number;
  /** Raster height in pixels. */
  height: number;
}

/**
 * Mirrors the editor's preview frame so reading and editing show the same block; the title stays accessible-only, like the editor.
 * @param marker - Data attribute identifying the diagram kind.
 * @param title - Diagram title used as alt text and label.
 * @param preview - Saved raster, or null when the diagram has none.
 * @param maxWidth - Frame width limit in pixels, matching the editor's preview sizing.
 * @returns Inert framed figure.
 */
export function diagramFigure(marker: string, title: string, preview: DiagramFigurePreview | null | undefined, maxWidth?: number): VNode {
  return h("figure", { [marker]: "true", "aria-label": title, style: {
    margin: "16px 0", width: "100%", maxWidth: maxWidth === undefined ? undefined : `${maxWidth}px`,
    border: "1px solid var(--qk-color-border-subtle,#e2e8f0)", borderRadius: "8px", overflow: "hidden", background: "white",
  } }, preview ? [h("img", {
    src: preview.url ?? preview.dataUrl, alt: title, width: preview.width, height: preview.height,
    style: { display: "block", maxWidth: "100%", maxHeight: "460px", width: "auto", height: "auto", objectFit: "contain", margin: "auto" },
  })] : []);
}
