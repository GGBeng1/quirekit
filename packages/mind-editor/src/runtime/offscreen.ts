import type { MindMapDocument, MindMapRasterSnapshot } from "@quirekit/mind-map";
import type { MindMapEditor } from "@quirekit/mind-map-simple";
import { createTheme, type QuireKitTheme } from "@quirekit/ui";
import { rasterizeMindMap } from "./raster";

/** Inputs of an offscreen mind map rendering. */
export interface MindMapPictureRenderOptions {
  /** Theme whose page surface fills the picture background. */ readonly theme?: QuireKitTheme | undefined;
  /** Cancels the rendering. */ readonly signal?: AbortSignal | undefined;
}

/**
 * Renders a mind map to the PNG its editor would save, without showing an editor.
 *
 * The mind map runtime only mounts in the global document, so a read-only editor is mounted in a
 * hidden, inert host outside the viewport, exports its SVG, and is removed again.
 *
 * @param document - Mind map to render.
 * @param options - Theme and cancellation.
 * @returns PNG bound to the exact serialized mind map.
 */
export async function renderMindMapPicture(document: MindMapDocument, options: MindMapPictureRenderOptions = {}): Promise<MindMapRasterSnapshot> {
  const { theme = createTheme(), signal } = options;
  const owner = globalThis.document;
  const host = owner.createElement("div");
  host.inert = true;
  host.setAttribute("aria-hidden", "true");
  host.style.cssText = "position:fixed;left:-12000px;top:0;width:1000px;height:800px;opacity:0;pointer-events:none;";
  const container = owner.createElement("div");
  container.style.cssText = "width:100%;height:100%;";
  host.attachShadow({ mode: "open" }).append(container);
  owner.body.append(host);
  let editor: MindMapEditor | undefined;
  try {
    // The editor runtime loads with the first rendering, keeping it out of hosts that only import this entry.
    const { createMindEditor } = await import("./create");
    editor = await createMindEditor({ container, document, theme, readOnly: true, ...(signal ? { signal } : {}) });
    return await rasterizeMindMap(await editor.exportSvg(), owner, theme.color.surface.page);
  } finally {
    try { await editor?.destroy(); } finally { host.remove(); }
  }
}
