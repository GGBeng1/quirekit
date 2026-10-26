import type { UserShortcuts } from "@unocss/core";
/** Group layout surrounds existing Checkbox controls without redefining their geometry. */
export const checkboxGroupShortcuts = [
  ["qk-checkbox-group", "m-0 min-w-0 border-0 p-0 font-qk-product", { layer: "qk-recipes" }],
  ["qk-checkbox-group__label", ["p-0 text-qk-compact leading-qk-compact font-medium", { color: "var(--qk-checkbox-group-label-color)", "margin-bottom": "var(--qk-checkbox-group-gap)" }], { layer: "qk-recipes" }],
  ["qk-checkbox-group__content", [{ display: "grid", gap: "var(--qk-checkbox-group-gap)", "min-width": "0" }], { layer: "qk-recipes" }],
  ["qk-checkbox-group__items", [{ display: "flex", "min-width": "0" }], { layer: "qk-recipes" }],
  ["qk-checkbox-group__items--vertical", [{ "flex-direction": "column", gap: "var(--qk-checkbox-group-gap)", "align-items": "flex-start" }], { layer: "qk-recipes" }],
  ["qk-checkbox-group__items--horizontal", [{ "flex-wrap": "wrap", gap: "var(--qk-checkbox-group-gap) var(--qk-checkbox-group-inline-gap)", "align-items": "flex-start" }], { layer: "qk-recipes" }]
] satisfies UserShortcuts;
/** Public group anatomy. */
export const checkboxGroupRecipeCatalog = Object.freeze(checkboxGroupShortcuts.map(shortcut => shortcut[0]));
