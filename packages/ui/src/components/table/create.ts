import type { QuireKitTheme } from "../../theme";
import type { QuireKitTableTokens } from "./types";

/**
 * Derives table roles without introducing a second palette or row-height scale.
 * @param theme - Current semantic theme.
 * @returns Table display tokens.
 */
export function createTableTokens(theme: QuireKitTheme): QuireKitTableTokens {
  return Object.freeze({
    foreground: theme.color.text.primary,
    mutedForeground: theme.color.text.secondary,
    headerBackground: theme.color.surface.page,
    currentBackground: theme.color.surface.selected,
    borderColor: theme.color.border.subtle,
    borderWidth: theme.borderWidth.default,
    compactPadding: theme.spacing.inline,
    padding: theme.spacing.surfaceCompact,
    comfortablePadding: theme.spacing.surface
  });
}
