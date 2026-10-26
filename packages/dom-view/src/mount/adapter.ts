import { DomEditorView } from "./runtime";
import type { DomViewAdapter, DomViewOptions } from "./types";

/**
 * Creates an opt-in native ProseMirror view adapter.
 * @param options - Native props applied independently to every mounted surface.
 * @returns Adapter registered for the dom mode.
 */
export function createDomViewAdapter(options: DomViewOptions = {}): DomViewAdapter {
  return {
    mode: "dom",
    /**
     * Mounts a surface with a single native input and plugin lifecycle.
     * @param mount - Core-owned mounting context.
     * @returns Mounted native DOM facade.
     */
    mount(mount) {
      return new DomEditorView(mount, options);
    }
  };
}
