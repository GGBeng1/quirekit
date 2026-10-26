import type { QuireKitTheme } from "../../theme";
import type { QuireKitKbdSize, QuireKitKbdSizeTokens, QuireKitKbdTokens } from "./types";

/**
 * Derives quiet monospace keycaps that fit inside same-density controls.
 * @param theme - Current semantic theme.
 * @returns Key hint tokens, including three independent typography scales.
 */
export function createKbdTokens(theme: QuireKitTheme): QuireKitKbdTokens {
  return {
    foreground: theme.color.text.secondary, background: theme.color.surface.subtle,
    borderColor: theme.color.border.default, borderWidth: theme.borderWidth.default,
    radius: theme.radius.control, fontFamily: theme.typography.code.fontFamily,
    fontWeight: theme.typography.code.fontWeight, letterSpacing: theme.typography.code.letterSpacing,
    size: {
      xs: keycapSize(theme, "xs"), sm: keycapSize(theme, "sm"), md: keycapSize(theme, "md")

    }
  };
}

/**
 * Derives keycaps from typography, independently of surrounding control height.
 * @param theme - Semantic source for dimensions and typography.
 * @param size - Inline typography scale.
 * @returns Keycap dimensions; xs uses helper type to remain readable at compact height.
 */
function keycapSize(theme: QuireKitTheme, size: QuireKitKbdSize): QuireKitKbdSizeTokens {
  const role = size === "xs" ? "helper" : size === "sm" ? "body" : "heading";
  const { inlineTight, inline } = theme.spacing;
  return {
    minHeight: `calc(${theme.typography[role].fontSize} * ${theme.typography[role].lineHeight})`,
    fontSize: theme.typography[size === "md" ? "compact" : "helper"].fontSize,
    // Multi-key labels such as "⌘ + K" need real side room inside the cap, not only single glyphs.
    paddingInline: size === "xs" ? inlineTight : size === "sm" ? inline : `calc(${inline} + ${inlineTight} / 2)`
  };
}
