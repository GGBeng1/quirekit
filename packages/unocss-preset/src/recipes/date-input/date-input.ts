import type { UserShortcuts } from "@unocss/core";
import { controlSizeShortcuts } from "../control/sizes";
/** Segmented dates share control geometry and semantic surfaces with text inputs. */
export const dateInputShortcuts = [
  ["qk-date-input", "grid min-w-0 max-w-full gap-qk-inline-tight", { layer: "qk-recipes" }],
  ["qk-date-input__label", "mb-qk-inline-tight block text-qk-control text-qk-text-primary", { layer: "qk-recipes" }],
  ["qk-date-input__control", ["flex min-w-0 items-center gap-qk-inline rounded-qk-control border border-solid border-qk-border-default bg-qk-surface-page px-qk-inline text-qk-text-primary focus-within:border-qk-border-focus [&[data-invalid]]:border-qk-danger-border [&[data-disabled]]:border-qk-border-disabled [&[data-disabled]]:bg-qk-surface-disabled [&[data-disabled]]:text-qk-text-disabled", { "box-sizing": "border-box" }], { layer: "qk-recipes" }],
  ...controlSizeShortcuts("qk-date-input__control"),
  ["qk-date-input__segments", "inline-flex min-w-0 flex-1 items-center gap-0 tabular-nums", { layer: "qk-recipes" }],
  // Ark marks decorative literals disabled; only editable segments use that state color.
  ["qk-date-input__segment", ["rounded-qk-control outline-none focus:bg-qk-action-soft focus:text-qk-action-text [&[data-placeholder-shown]:not([data-disabled]):not(:focus)]:text-qk-text-placeholder [&[data-disabled]:not([data-type=literal])]:text-qk-text-disabled", { "white-space": "nowrap", "text-align": "center", "min-width": "2ch" }], { layer: "qk-recipes" }],
  ["qk-date-input__literal", "[&[data-type=literal]]:min-w-0 [&[data-type=literal]]:text-inherit", { layer: "qk-recipes" }],
  ["qk-date-input__actions", "inline-flex shrink-0 items-center gap-qk-inline-tight", { layer: "qk-recipes" }],
  ["qk-date-input__adornment", "inline-flex shrink-0 text-qk-text-secondary", { layer: "qk-recipes" }],
  ["qk-date-input__message", "m-0 text-qk-helper text-qk-text-secondary", { layer: "qk-recipes" }],
  ["qk-date-input__message--invalid", "text-qk-danger-text", { layer: "qk-recipes" }]
] satisfies UserShortcuts;
/** Public date-input recipe classes used for CSS emission and token discovery. */
export const dateInputRecipeCatalog = Object.freeze(dateInputShortcuts.map(shortcut => shortcut[0]));
