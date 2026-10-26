import type { UserShortcuts } from "@unocss/core";
/** Decorative, naturally sized placeholders share theme surfaces and corners. */
export const skeletonShortcuts = [
  ["qk-skeleton", [{ display: "block", "max-width": "100%", "flex-shrink": "0", "background-color": "var(--qk-skeleton-background)", "border-radius": "var(--qk-skeleton-radius)" }], { layer: "qk-recipes" }],
  ["qk-skeleton--rectangle", [{ "border-radius": "var(--qk-skeleton-radius)" }], { layer: "qk-recipes" }],
  ["qk-skeleton--circle", [{ "border-radius": "50%" }], { layer: "qk-recipes" }],
  ["qk-skeleton--animated", [{ animation: "qk-skeleton-pulse var(--qk-skeleton-duration) var(--qk-skeleton-easing) infinite" }], { layer: "qk-recipes" }]
] satisfies UserShortcuts;
/** Motion affects only empty decorative shapes and respects the user's preference. */
export const skeletonStaticCss = `
@keyframes qk-skeleton-pulse { 0%, 100% { opacity: var(--qk-skeleton-maximum-opacity); } 50% { opacity: var(--qk-skeleton-minimum-opacity); } }
@media (prefers-reduced-motion: reduce) { .qk-skeleton--animated { animation: none !important; } }
`;
/** Public placeholder geometry and motion classes. */
export const skeletonRecipeCatalog = Object.freeze(skeletonShortcuts.map(shortcut => shortcut[0]));
