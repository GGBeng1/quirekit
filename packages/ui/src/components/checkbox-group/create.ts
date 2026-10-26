import type { QuireKitTheme } from "../../theme";
import type { QuireKitCheckboxGroupTokens } from "./types";
/**
 * Derives group layout from existing semantic roles; child controls keep their own sizes.
 * @param theme - Current theme.
 * @returns Group-level configuration.
 */
export function createCheckboxGroupTokens(theme: QuireKitTheme): QuireKitCheckboxGroupTokens {
  return { gap: theme.spacing.inline, inlineGap: theme.spacing.surface, labelColor: theme.color.text.secondary };
}
