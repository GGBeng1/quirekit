import type { QuireKitTheme } from "@quirekit/ui";
import type { MindMapAppearance } from "@quirekit/mind-map-simple";

/** @param theme - Shared UI semantic theme. @returns Node/connector colors matching the editor chrome. */
export function mindEditorAppearance(theme: QuireKitTheme): MindMapAppearance {
  return { primary: theme.color.action.primary, onPrimary: theme.color.action.foreground,
    text: theme.color.text.primary, surface: theme.color.surface.page, soft: theme.color.action.soft,
    border: theme.color.border.default, fontFamily: theme.typography.body.fontFamily };
}
