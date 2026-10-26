import type { QuireKitSkeletonTokens } from "../types";
/**
 * Publishes traceable placeholder CSS roles.
 * @param tokens - Skeleton configuration.
 * @returns Direct CSS projections.
 */
export function createSkeletonCssVariables(tokens: QuireKitSkeletonTokens): Readonly<Record<string, string>> {
  return { "--qk-skeleton-background": tokens.background, "--qk-skeleton-line-height": tokens.lineHeight, "--qk-skeleton-radius": tokens.radius, "--qk-skeleton-duration": tokens.duration, "--qk-skeleton-easing": tokens.easing, "--qk-skeleton-minimum-opacity": String(tokens.minimumOpacity), "--qk-skeleton-maximum-opacity": String(tokens.maximumOpacity) };
}
