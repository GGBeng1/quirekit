import { Extension, type QuireExtension } from "@quirekit/core";
import { createHtmlViewAdapter } from "./adapter";
import type { HtmlMountedViewRuntimeOptions } from "./types";

/** Options accepted by the HTML mounted view extension. */
export interface HtmlViewExtensionOptions {
  /** Runtime options applied when the editor mounts HTML mode. */
  readonly runtime?: HtmlMountedViewRuntimeOptions | undefined;
}

/** Tiptap-compatible extension that registers the HTML mounted view runtime. */
export const HtmlViewExtension = Extension.create<HtmlViewExtensionOptions>({
  name: "html-view",
  addOptions() {
    return {};
  },
  addViewAdapters() {
    return [
      createHtmlViewAdapter({
        runtime: this.options.runtime
      })
    ];
  }
});

/**
 * Creates a configured HTML mounted view extension.
 *
 * @param options - Runtime options for HTML mode.
 * @returns Configured HTML mounted view extension.
 */
export function htmlViewExtension(
  options: Partial<HtmlViewExtensionOptions> = {}
): QuireExtension<HtmlViewExtensionOptions> {
  return HtmlViewExtension.configure(options);
}
