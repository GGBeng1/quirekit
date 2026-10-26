import { Extension, type QuireExtension } from "@quirekit/core";
import { createSvgViewAdapter } from "./adapter";
import type { SvgMountedViewRuntimeOptions } from "./types";

/** Options accepted by the SVG mounted view extension. */
export interface SvgViewExtensionOptions {
  /** Runtime options applied when the editor mounts SVG mode. */
  readonly runtime?: SvgMountedViewRuntimeOptions | undefined;
}

/** Tiptap-compatible extension that registers the SVG mounted view runtime. */
export const SvgViewExtension = Extension.create<SvgViewExtensionOptions>({
  name: "svg-view",
  addOptions() {
    return {};
  },
  addViewAdapters() {
    return [
      createSvgViewAdapter({
        runtime: this.options.runtime
      })
    ];
  }
});

/**
 * Creates a configured SVG mounted view extension.
 *
 * @param options - Runtime options for SVG mode.
 * @returns Configured SVG mounted view extension.
 */
export function svgViewExtension(
  options: Partial<SvgViewExtensionOptions> = {}
): QuireExtension<SvgViewExtensionOptions> {
  return SvgViewExtension.configure(options);
}
