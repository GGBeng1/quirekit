import { Extension } from "@quirekit/core";
import { createDomViewAdapter } from "./adapter";
import type { DomViewOptions } from "./types";

/** Registers native contenteditable without loading the retained rendering engine. */
export const DomViewExtension = Extension.create<DomViewOptions>({
  name: "dom-view",
  /** @returns Empty native prop overrides. */
  addOptions() { return {}; },
  /** @returns The native DOM adapter for this configured extension. */
  addViewAdapters() { return [createDomViewAdapter(this.options)]; }
});

/**
 * Configures the native DOM extension for a lightweight editor.
 * @param options - Native view props and direct plugins.
 * @returns Configured extension, suitable for Editor.extensions.
 */
export function domViewExtension(options: DomViewOptions = {}) {
  return DomViewExtension.configure(options);
}
