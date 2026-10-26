import { Extension, type QuireExtension } from "@quirekit/core";
import { createCanvasViewAdapter } from "./adapter";
import type { CanvasMountedViewRuntimeOptions } from "./types";

/** Options accepted by the Canvas mounted view extension. */
export interface CanvasViewExtensionOptions {
  /** Runtime options applied when the editor mounts canvas mode. */
  readonly runtime?: CanvasMountedViewRuntimeOptions | undefined;
}

/** Tiptap-compatible extension that registers the Canvas mounted view runtime. */
export const CanvasViewExtension = Extension.create<CanvasViewExtensionOptions>({
  name: "canvas-view",
  addOptions() {
    return {};
  },
  addViewAdapters() {
    return [
      createCanvasViewAdapter({
        runtime: this.options.runtime
      })
    ];
  }
});

/**
 * Creates a configured Canvas mounted view extension.
 *
 * @param options - Runtime options for canvas mode.
 * @returns Configured Canvas mounted view extension.
 */
export function canvasViewExtension(
  options: Partial<CanvasViewExtensionOptions> = {}
): QuireExtension<CanvasViewExtensionOptions> {
  return CanvasViewExtension.configure(options);
}
