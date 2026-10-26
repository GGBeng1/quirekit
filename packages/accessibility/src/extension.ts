import { Extension } from "@quirekit/core";
import type {} from "@quirekit/view/mounted-services";
import type { QuireAccessibilityOptions } from "./types";
import { accessibilityDefaults } from "./defaults";
import { destroyAccessibility, installAccessibility } from "./runtime/controller";

/** Explicit optional Canvas/SVG accessibility; not installed by any default preset. */
export const Accessibility = Extension.create<QuireAccessibilityOptions>({
  name: "accessibility",
  /** @returns Independent installation policy defaults. */
  addOptions() { return accessibilityDefaults; },
  /** Initializes an editor-local controller before any mounted service is created. */
  onCreate() { if (this.editor) installAccessibility(this.editor, this.options); },
  /** @returns Actual mounted services, with no PM plugin reconfiguration. */
  addMountedViewServices() {
    const options = this.options;
    return [{ id: "accessibility", create: (context) => installAccessibility(context.editor, options).mount(context) }];
  },
  /** Releases the editor-local controller and any remaining mounted resources. */
  onDestroy() { if (this.editor) destroyAccessibility(this.editor); }
});
