import type { QuireKitTheme } from "../../theme";
import type { QuireKitSkeletonTokens } from "./types";
/**
 * Derives decorative placeholder geometry and color from the active theme.
 * @param theme - Current theme.
 * @returns Skeleton configuration.
 */
export function createSkeletonTokens(theme: QuireKitTheme): QuireKitSkeletonTokens {
  return { background: theme.color.surface.hover, lineHeight: `calc(${theme.typography.body.fontSize} * ${theme.typography.body.lineHeight})`, radius: theme.radius.control, duration: `calc(${theme.motion.overlayDuration} * 8)`, easing: theme.motion.standardEasing, minimumOpacity: theme.opacity.muted, maximumOpacity: theme.opacity.opaque };
}
