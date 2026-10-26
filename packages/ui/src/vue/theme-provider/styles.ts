import type { CSSProperties } from "vue";
import { createUiThemeCssVariables } from "../../styles/theme";
import type { QuireKitTheme } from "../../theme/types";

const contentsStyles = new WeakMap<QuireKitTheme, Readonly<CSSProperties>>();
const bridgeStyles = new WeakMap<QuireKitTheme, Readonly<CSSProperties>>();

/**
 * Retains the native scope's complete style independently of dynamic content attrs.
 * @param theme - Immutable semantic authority shared by ordinary and portal scopes.
 * @param layout - Whether this is a layout-neutral provider or a floating portal bridge.
 * @returns Stable styles that create inheritance with the requested box policy.
 */
export function resolveThemeSurfaceStyle(
  theme: QuireKitTheme,
  layout: "contents" | "bridge" = "contents"
): Readonly<CSSProperties> {
  const cache = layout === "contents" ? contentsStyles : bridgeStyles;
  const retained = cache.get(theme);
  if (retained) return retained;

  // One immutable style identity is the invalidation boundary. Never merge
  // content attrs here: Vue/Ark normalization would turn every update into a
  // complete theme patch even when every variable still has the same value.
  const value = Object.freeze({
    ...createUiThemeCssVariables(theme),
    display: layout === "contents" ? "contents" : "block",
    // Floating scopes must never become flex/grid items while parked beside their trigger.
    ...(layout === "bridge" ? { position: "absolute" as const } : {}),
    colorScheme: theme.scheme,
  });
  cache.set(theme, value);
  return value;
}
