import type { QuireKitTheme } from "../../theme";
import type { QuireKitTagColorTokens, QuireKitTagTokens } from "./types";

/**
 * Maps static status labels to existing semantic colors, without a separate palette.
 * @param theme - Active semantic theme.
 * @returns Tag color and geometry configuration.
 */
export function createTagTokens(theme: QuireKitTheme): QuireKitTagTokens {
  const color = theme.color;
  return Object.freeze({
    paddingInline: theme.spacing.inline, paddingBlock: theme.spacing.inlineTight,
    gap: theme.spacing.inlineTight, radius: theme.radius.control, borderWidth: theme.borderWidth.default,
    color: {
      neutral: { text: color.text.secondary, surface: color.surface.subtle, border: color.border.default, solid: color.surface.inverse, onSolid: color.text.inverse },
      primary: { text: color.action.text, surface: color.action.soft, border: color.action.primary, solid: color.action.primary, onSolid: color.action.foreground },
      info: feedback(color.info), success: feedback(color.success), warning: feedback(color.warning), danger: feedback(color.danger)
    }
  });
}

/**
 * Selects only the five static tag roles from a feedback family.
 * @param color - Existing feedback semantics.
 * @returns The Tag color contract, without unrelated interaction states.
 */
function feedback(color: QuireKitTheme["color"]["info"]): QuireKitTagColorTokens {
  return { text: color.text, surface: color.surface, border: color.border, solid: color.solid, onSolid: color.onSolid };
}
