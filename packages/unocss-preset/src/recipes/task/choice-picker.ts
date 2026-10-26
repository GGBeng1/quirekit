import type { UserShortcuts } from "@unocss/core";

/** Selection task regions with one scroll owner and stable fixed controls. */
export const choicePickerRecipeCatalog = Object.freeze([
  "qk-choice-picker__surface", "qk-choice-picker__surface--desktop", "qk-choice-picker__surface--bottom",
  "qk-choice-picker__header", "qk-choice-picker__heading", "qk-choice-picker__search",
  "qk-choice-picker__body", "qk-choice-picker__options", "qk-choice-picker__list", "qk-choice-picker__item",
  "qk-choice-picker__footer", "qk-choice-picker__footer-content", "qk-choice-picker__actions", "qk-choice-picker__status"
]);

/** Uses existing Popover and Drawer surfaces; only the central body scrolls. */
export const choicePickerShortcuts = [
  ["qk-choice-picker__surface", "min-w-0", { layer: "qk-recipes" }],
  ["qk-choice-picker__surface--desktop", "[&.qk-popover\\_\\_content]:w-[min(24rem,calc(100vw-1rem))] [&.qk-popover\\_\\_content]:max-h-[min(34rem,var(--available-height,calc(100dvh-2rem)))] [&.qk-popover\\_\\_content]:grid-rows-[auto_minmax(0,1fr)_auto] [&.qk-popover\\_\\_content]:overflow-hidden [&.qk-popover\\_\\_content]:p-0 [&.qk-popover\\_\\_content]:gap-0", { layer: "qk-recipes" }],
  ["qk-choice-picker__surface--bottom", "[overscroll-behavior:contain]", { layer: "qk-recipes" }],
  ["qk-choice-picker__header", "grid min-w-0 gap-qk-group p-qk-surface border-0 border-b border-solid border-qk-border-subtle", { layer: "qk-recipes" }],
  ["qk-choice-picker__heading", "flex min-w-0 items-start justify-between gap-qk-group", { layer: "qk-recipes" }],
  ["qk-choice-picker__search", "grid min-w-0 gap-qk-inline-tight text-qk-helper text-qk-text-secondary", { layer: "qk-recipes" }],
  ["qk-choice-picker__body", "min-h-0 overflow-y-auto overscroll-contain p-qk-inline", { layer: "qk-recipes" }],
  ["qk-choice-picker__options", "min-w-0", { layer: "qk-recipes" }],
  ["qk-choice-picker__list", "[--qk-listbox-max-height:none] [&.qk-listbox\\_\\_content]:overflow-visible", { layer: "qk-recipes" }],
  ["qk-choice-picker__item", "[&.qk-listbox\\_\\_item]:min-h-[var(--qk-control-touch-target)] [&.qk-listbox\\_\\_item]:py-qk-inline", { layer: "qk-recipes" }],
  ["qk-choice-picker__footer", "border-0 border-t border-solid border-qk-border-subtle p-qk-surface", { layer: "qk-recipes" }],
  ["qk-choice-picker__footer-content", "flex min-w-0 w-full flex-wrap items-center justify-between gap-qk-surface-compact", { layer: "qk-recipes" }],
  ["qk-choice-picker__actions", "flex flex-wrap items-center justify-end gap-qk-inline", { layer: "qk-recipes" }],
  ["qk-choice-picker__status", "m-0 min-h-[calc(var(--qk-type-helper-font-size)*var(--qk-type-helper-line-height))] text-qk-helper leading-qk-helper text-qk-text-secondary [&[role=alert]]:text-qk-danger-text", { layer: "qk-recipes" }]
] satisfies UserShortcuts;
