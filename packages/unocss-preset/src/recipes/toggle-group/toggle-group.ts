import type { UserShortcuts } from "@unocss/core";
/** Toggle actions share the Button contract; only their group spacing is new. */
export const toggleGroupShortcuts = [
  ["qk-toggle-group-field", "min-w-0 max-w-full", { layer: "qk-recipes" }],
  ["qk-toggle-group__content", "flex min-w-0 items-center justify-center gap-1", { layer: "qk-recipes" }],
  ["qk-toggle-group", [{ display: "flex", "min-width": "0", gap: "var(--qk-toggle-group-gap)" }], { layer: "qk-recipes" }],
  ["qk-toggle-group--horizontal", "flex-wrap items-center", { layer: "qk-recipes" }],
  ["qk-toggle-group__item--selected-primary", "enabled:bg-qk-button-primary-soft-background enabled:hover:[&:not(:active)]:[background-color:var(--qk-button-primary-soft-hover-background)]", { layer: "qk-recipes" }],
  ["qk-toggle-group__item--selected-neutral", "enabled:border-qk-border-strong enabled:bg-qk-button-neutral-soft-background enabled:hover:[&:not(:active)]:[background-color:var(--qk-button-neutral-soft-hover-background)]", { layer: "qk-recipes" }],
  ["qk-toggle-group--vertical", "flex-col items-start", { layer: "qk-recipes" }]
] satisfies UserShortcuts;
/** Public toggle layout classes. */
export const toggleGroupRecipeCatalog = Object.freeze(toggleGroupShortcuts.map(shortcut => shortcut[0]));
