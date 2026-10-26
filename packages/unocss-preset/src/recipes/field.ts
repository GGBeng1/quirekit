import type { UserShortcuts } from "@unocss/core";

/** UnoCSS preset 发布的 Field anatomy 类。 */
export const fieldRecipeCatalog = Object.freeze([
  "qk-field",
  "qk-field--invalid",
  "qk-field--disabled",
  "qk-field--mixed",
  "qk-field--busy",
  "qk-field__header",
  "qk-field__label",
  "qk-field__required",
  "qk-field__meta",
  "qk-field__message",
  "qk-field__message--description",
  "qk-field__message--mixed",
  "qk-field__message--busy",
  "qk-field__message--disabled",
  "qk-field__message--error",
  "qk-field__busy-indicator"
]);

/** Field 的公开 UnoCSS shortcuts。 */
export const fieldShortcuts = [
  ["qk-field", "grid content-start min-w-0 gap-qk-inline", { layer: "qk-recipes" }],
  ["qk-field--disabled", "text-qk-text-disabled", { layer: "qk-recipes" }],
  ["qk-field--mixed", "", { layer: "qk-recipes" }],
  ["qk-field--busy", "", { layer: "qk-recipes" }],
  ["qk-field--invalid", "", { layer: "qk-recipes" }],
  ["qk-field__header", "flex min-w-0 items-center justify-between gap-qk-inline", { layer: "qk-recipes" }],
  ["qk-field__label", "min-w-0 text-qk-compact leading-qk-compact font-medium text-qk-text-secondary", { layer: "qk-recipes" }],
  ["qk-field__required", "ms-0.5 text-qk-danger-foreground", { layer: "qk-recipes" }],
  ["qk-field__meta", "shrink-0 text-qk-helper leading-qk-helper text-qk-text-tertiary", { layer: "qk-recipes" }],
  ["qk-field__message", "m-0 flex min-w-0 items-center gap-qk-inline text-qk-helper leading-qk-helper text-qk-text-tertiary", { layer: "qk-recipes" }],
  ["qk-field__message--description", "", { layer: "qk-recipes" }],
  ["qk-field__message--mixed", "text-qk-text-secondary", { layer: "qk-recipes" }],
  ["qk-field__message--busy", "text-qk-text-secondary", { layer: "qk-recipes" }],
  ["qk-field__message--disabled", "text-qk-text-disabled", { layer: "qk-recipes" }],
  ["qk-field__message--error", "text-qk-danger-foreground", { layer: "qk-recipes" }],
  [
    "qk-field__busy-indicator",
    [
      "size-3 shrink-0 animate-spin rounded-full border border-qk-border-subtle border-t-qk-border-strong motion-reduce:animate-none"
    ],
    { layer: "qk-recipes" }
  ]
] satisfies UserShortcuts;
