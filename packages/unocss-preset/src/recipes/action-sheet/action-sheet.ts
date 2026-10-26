import type { UserShortcuts } from "@unocss/core";

/** Public anatomy for a bottom action task, composed with Drawer. */
export const actionSheetRecipeCatalog = Object.freeze([
  "qk-action-sheet", "qk-action-sheet__group", "qk-action-sheet__group-label", "qk-action-sheet__action",
  "qk-action-sheet__icon", "qk-action-sheet__copy", "qk-action-sheet__label", "qk-action-sheet__description",
  "qk-action-sheet__empty", "qk-action-sheet__footer", "qk-action-sheet__status", "qk-action-sheet__error", "qk-action-sheet__cancel"
]);

/** Touch-sized action rows without a second surface, selection role, or elevation owner. */
export const actionSheetShortcuts = [
  ["qk-action-sheet", "grid min-w-0 gap-qk-surface font-qk-product text-qk-text-primary", { layer: "qk-recipes" }],
  ["qk-action-sheet__group", "grid min-w-0 gap-qk-inline-tight", { layer: "qk-recipes" }],
  ["qk-action-sheet__group-label", "m-0 px-qk-inline py-qk-inline-tight text-qk-helper leading-qk-helper font-qk-control text-qk-text-tertiary", { layer: "qk-recipes" }],
  ["qk-action-sheet__action", "flex w-full min-w-0 min-h-[var(--qk-control-touch-target)] items-center gap-qk-inline rounded-qk-control border-0 bg-transparent px-qk-surface-compact py-qk-inline [text-align:start] cursor-pointer [outline:none] hover:bg-qk-surface-hover active:bg-qk-surface-pressed [outline:none] focus-visible:bg-qk-surface-hover data-[danger]:text-qk-danger-text data-[danger]:hover:[&:not(:active)]:bg-qk-danger-hover-surface data-[danger]:active:bg-qk-danger-pressed-surface disabled:cursor-not-allowed disabled:text-qk-text-disabled aria-disabled:cursor-default", { layer: "qk-recipes" }],
  ["qk-action-sheet__icon", "grid shrink-0 size-5 place-items-center", { layer: "qk-recipes" }],
  ["qk-action-sheet__copy", "grid min-w-0 gap-qk-inline-tight", { layer: "qk-recipes" }],
  ["qk-action-sheet__label", "font-qk-control break-words text-qk-body leading-qk-body", { layer: "qk-recipes" }],
  ["qk-action-sheet__description", "font-qk-helper break-words text-qk-helper leading-qk-helper text-qk-text-tertiary", { layer: "qk-recipes" }],
  ["qk-action-sheet__empty", "m-0 py-qk-group text-center text-qk-text-tertiary text-qk-compact leading-qk-compact", { layer: "qk-recipes" }],
  ["qk-action-sheet__footer", "grid w-full min-w-0 gap-qk-inline", { layer: "qk-recipes" }],
  ["qk-action-sheet__status", "m-0 text-qk-helper leading-qk-helper text-qk-text-secondary", { layer: "qk-recipes" }],
  ["qk-action-sheet__error", "m-0 text-qk-helper leading-qk-helper text-qk-danger-text", { layer: "qk-recipes" }],
  ["qk-action-sheet__cancel", "w-full min-h-[var(--qk-control-touch-target)] px-qk-surface py-qk-inline text-qk-body leading-qk-body aria-disabled:cursor-default", { layer: "qk-recipes" }]
] satisfies UserShortcuts;
