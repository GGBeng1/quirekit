import type { UserShortcuts } from "@unocss/core";

/** Public form layout anatomy; Field/Fieldset retain visual ownership. */
export const formRecipeCatalog = Object.freeze([
  "qk-form", "qk-form__control", "qk-form__actions", "qk-form__error"
]);

/** Intrinsic responsive layout using existing semantic spacing and text tokens. */
export const formShortcuts = [
  ["qk-form", "grid w-full min-w-0 gap-qk-surface-compact", { layer: "qk-recipes" }],
  ["qk-form__control", "min-w-0 [&_.qk-select\\_\\_control]:w-full", { layer: "qk-recipes" }],
  ["qk-form__actions", "flex min-w-0 flex-wrap items-center gap-qk-inline mt-[calc(var(--qk-space-group)-var(--qk-space-surface-compact))]", { layer: "qk-recipes" }],
  ["qk-form__error", "min-w-0 break-words text-qk-helper leading-qk-helper text-qk-danger-foreground", { layer: "qk-recipes" }]
] satisfies UserShortcuts;
