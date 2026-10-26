import type { UserShortcuts } from "@unocss/core";

/** Public anatomy of the shared table dimension picker. */
export const tableSizePickerRecipeCatalog = Object.freeze(["qk-table-size-picker", "qk-table-size-picker__size", "qk-table-size-picker__grid", "qk-table-size-picker__row", "qk-table-size-picker__cell", "qk-table-size-picker__form", "qk-table-size-picker__actions", "qk-table-size-picker__error"]);

/** Semantic grid, field and state styles shared by every editor. */
export const tableSizePickerShortcuts = [
  ["qk-table-size-picker", "grid w-[227px] max-w-full gap-qk-inline text-qk-text-primary text-qk-compact leading-qk-compact", { layer: "qk-recipes" }],
  ["qk-table-size-picker__size", "m-0 min-h-5 text-center font-medium", { layer: "qk-recipes" }],
  ["qk-table-size-picker__grid", "grid gap-[3px]", { layer: "qk-recipes" }],
  ["qk-table-size-picker__row", "grid grid-cols-10 gap-[3px]", { layer: "qk-recipes" }],
  ["qk-table-size-picker__cell", "w-5 h-5 p-0 rounded-[2px] border border-solid border-qk-border-strong bg-qk-surface-raised cursor-pointer [outline:none] data-[focus-visible]:outline-solid data-[focus-visible]:outline-2 data-[focus-visible]:outline-qk-border-focus data-[focus-visible]:outline-offset-[-2px] data-[highlighted]:bg-qk-surface-selected data-[highlighted]:border-qk-action-primary hover:bg-qk-surface-selected disabled:opacity-50 disabled:cursor-not-allowed", { layer: "qk-recipes" }],
  ["qk-table-size-picker__form", "grid gap-qk-inline", { layer: "qk-recipes" }],
  ["qk-table-size-picker__actions", "flex justify-end gap-qk-inline", { layer: "qk-recipes" }],
  ["qk-table-size-picker__error", "m-0 text-qk-danger-foreground text-qk-helper", { layer: "qk-recipes" }],
] satisfies UserShortcuts;
