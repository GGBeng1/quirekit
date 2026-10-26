import type { UserShortcuts } from "@unocss/core";

/** UnoCSS preset 发布的 Fieldset anatomy 类。 */
export const fieldsetRecipeCatalog = Object.freeze([
  "qk-fieldset",
  "qk-fieldset--outline",
  "qk-fieldset--plain",
  "qk-fieldset--invalid",
  "qk-fieldset--disabled",
  "qk-fieldset__legend",
  "qk-fieldset__legend--hidden",
  "qk-fieldset__legend-label",
  "qk-fieldset__meta",
  "qk-fieldset__body",
  "qk-fieldset__message",
  "qk-fieldset__message--error",
  "qk-fieldset__content",
  "qk-fieldset__content--vertical",
  "qk-fieldset__content--horizontal"
]);

/** Fieldset 分组、状态与布局样式。 */
export const fieldsetShortcuts = [
  [
    "qk-fieldset",
    "relative m-0 min-w-0 border-0 bg-transparent p-0 text-qk-text-primary",
    { layer: "qk-recipes" }
  ],
  ["qk-fieldset--outline", "rounded-qk-dialog border border-solid border-qk-border-default p-qk-surface", { layer: "qk-recipes" }],
  ["qk-fieldset--plain", "", { layer: "qk-recipes" }],
  ["qk-fieldset--invalid", "", { layer: "qk-recipes" }],
  ["qk-fieldset--disabled", "text-qk-text-disabled", { layer: "qk-recipes" }],
  [
    "qk-fieldset__legend",
    "box-border float-left flex w-full min-w-0 items-start justify-between gap-qk-inline border-0 p-0 pb-qk-inline",
    { layer: "qk-recipes" }
  ],
  ["qk-fieldset__legend--hidden", "sr-only", { layer: "qk-recipes" }],
  ["qk-fieldset__legend-label", "min-w-0 break-words text-qk-heading leading-qk-heading font-semibold", { layer: "qk-recipes" }],
  ["qk-fieldset__meta", "shrink-0 text-qk-helper leading-qk-helper font-normal text-qk-text-tertiary", { layer: "qk-recipes" }],
  ["qk-fieldset__body", "clear-both grid min-w-0 gap-qk-surface", { layer: "qk-recipes" }],
  ["qk-fieldset__message", "m-0 text-qk-helper leading-qk-helper text-qk-text-secondary", { layer: "qk-recipes" }],
  ["qk-fieldset__message--error", "text-qk-danger-foreground", { layer: "qk-recipes" }],
  ["qk-fieldset__content", "grid min-w-0 gap-x-qk-group gap-y-qk-surface-compact", { layer: "qk-recipes" }],
  ["qk-fieldset__content--vertical", "grid-cols-1", { layer: "qk-recipes" }],
  ["qk-fieldset__content--horizontal", "grid-cols-1 sm:grid-cols-2", { layer: "qk-recipes" }]
] satisfies UserShortcuts;
