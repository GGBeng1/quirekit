import type { ClassicEditorUpdateOptions, ClassicEditorPreset, QuireKitTheme } from "../../types";

/**
 * Separates presentation/input changes from schema and resource reassembly.
 * @param update - Requested consumer update.
 * @param preset - Preset owning the current session.
 * @param theme - Current theme identity.
 * @returns Whether the current Core can remain authoritative.
 */
export function canRetainClassicEditorSession(
  update: ClassicEditorUpdateOptions,
  preset: ClassicEditorPreset,
  theme: QuireKitTheme
): boolean {
  return Object.entries(update).every(([name, value]) => value === undefined
    || name === "locale" || name === "editable" || name === "theme")
    && (update.theme === undefined || update.theme === theme || preset.updatePresentation !== undefined);
}
