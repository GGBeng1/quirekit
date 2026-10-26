import type { FlowchartDocument, FlowchartRasterSnapshot } from "@quirekit/flowchart";
import { createTheme, type QuireKitTheme } from "@quirekit/ui";
import type { createFlowEditor } from "./create";
import { rasterizeFlowchart } from "./raster";

/** Inputs of an offscreen flowchart rendering. */
export interface FlowchartPictureRenderOptions {
  /** Document hosting the hidden renderer. */ readonly ownerDocument: Document;
  /** Theme whose page surface fills the picture background. */ readonly theme?: QuireKitTheme | undefined;
  /** Cancels the rendering. */ readonly signal?: AbortSignal | undefined;
}

/**
 * Renders a flowchart to the PNG its editor would save, without showing an editor.
 *
 * A read-only editor is mounted in a hidden, inert host outside the viewport, exports its SVG,
 * and is removed again.
 *
 * @param document - Graph to render.
 * @param options - Host document, theme and cancellation.
 * @returns PNG bound to the exact serialized graph.
 */
export async function renderFlowchartPicture(document: FlowchartDocument, options: FlowchartPictureRenderOptions): Promise<FlowchartRasterSnapshot> {
  const { ownerDocument, theme = createTheme(), signal } = options;
  const host = ownerDocument.createElement("div");
  host.setAttribute("aria-hidden", "true");
  host.inert = true;
  host.style.cssText = "position:fixed;left:-20000px;top:0;width:1200px;height:900px;visibility:hidden;pointer-events:none";
  ownerDocument.body.append(host);
  let editor: Awaited<ReturnType<typeof createFlowEditor>> | undefined;
  try {
    // The editor runtime loads with the first rendering, keeping it out of hosts that only import this entry.
    const { createFlowEditor: create } = await import("./create");
    editor = await create({ container: host, document, theme, readOnly: true, label: "图形渲染", ...(signal ? { signal } : {}) });
    return await rasterizeFlowchart(await editor.exportSvg(), ownerDocument, theme.color.surface.page);
  } finally {
    editor?.destroy();
    host.remove();
  }
}
