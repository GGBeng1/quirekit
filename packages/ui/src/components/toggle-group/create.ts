import type { QuireKitTheme } from "../../theme";
import type { QuireKitToggleGroupTokens } from "./types";
/**
 * Derives group layout from existing semantic roles; child controls keep their own sizes.
 * @param theme - Current theme.
 * @returns Group-level configuration.
 */
export function createToggleGroupTokens(theme: QuireKitTheme): QuireKitToggleGroupTokens {
  return { gap: theme.spacing.inlineTight };
}
