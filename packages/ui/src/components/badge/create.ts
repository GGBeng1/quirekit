import type { QuireKitTheme } from "../../theme";
import type { QuireKitBadgeColorTokens, QuireKitBadgeTokens } from "./types";

/**
 * Maps notification markers to existing semantic colors, without a separate palette.
 * @param theme - Active semantic theme.
 * @returns Badge color and geometry configuration.
 */
export function createBadgeTokens(theme: QuireKitTheme): QuireKitBadgeTokens {
  const color = theme.color;
  return Object.freeze({
    paddingInline: theme.spacing.inlineTight, dotSize: theme.spacing.inline,
    size: {
      xs: { height: `calc(${theme.typography.helper.fontSize} * ${theme.typography.helper.lineHeight})`, fontSize: theme.typography.helper.fontSize },
      sm: { height: `calc(${theme.typography.compact.fontSize} * ${theme.typography.compact.lineHeight})`, fontSize: theme.typography.helper.fontSize },
      md: { height: `calc(${theme.typography.body.fontSize} * ${theme.typography.body.lineHeight})`, fontSize: theme.typography.compact.fontSize }
    },
    radius: theme.radius.pill, borderWidth: theme.borderWidth.default,
    color: {
      neutral: { text: color.text.secondary, surface: color.surface.subtle, border: color.border.default, solid: color.surface.inverse, onSolid: color.text.inverse },
      primary: { text: color.action.text, surface: color.action.soft, border: color.action.primary, solid: color.action.primary, onSolid: color.action.foreground },
      info: feedback(color.info), success: feedback(color.success), warning: feedback(color.warning), danger: feedback(color.danger)
    }
  });
}

/**
 * Selects only the five static badge roles from a feedback family.
 * @param color - Existing feedback semantics.
 * @returns The Badge color contract, without unrelated interaction states.
 */
function feedback(color: QuireKitTheme["color"]["info"]): QuireKitBadgeColorTokens {
  return { text: color.text, surface: color.surface, border: color.border, solid: color.solid, onSolid: color.onSolid };
}
