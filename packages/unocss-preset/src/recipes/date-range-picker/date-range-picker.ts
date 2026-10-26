import type { UserShortcuts } from "@unocss/core";
import { controlSizeShortcuts } from "../control/sizes";

/** Range input keeps date segments, shared field geometry and independent panel density. */
export const dateRangePickerShortcuts = [
  ["qk-date-range-picker__label", "m-0", { layer: "qk-recipes" }],
  ["qk-date-range-picker__control", "flex-wrap", { layer: "qk-recipes" }],
  ...controlSizeShortcuts("qk-date-range-picker__control", "min-height"),
  ["qk-date-range-picker__endpoint", ["inline-flex items-center", { flex: "1 1 auto", "min-width": "max-content", "min-height": "calc(var(--qk-control-size-height) - var(--qk-border-width-default) * 2)" }], { layer: "qk-recipes" }],
  ["qk-date-range-picker__endpoint-control", "inline-flex w-full", { layer: "qk-recipes" }],
  ["qk-date-range-picker__separator", "text-qk-text-tertiary", { layer: "qk-recipes" }],
  ["qk-date-range-picker__actions", ["qk-date-input__actions ml-auto", { height: "calc(var(--qk-control-size-height) - var(--qk-border-width-default) * 2)" }], { layer: "qk-recipes" }],
  ["qk-date-range-picker__status", "m-0", { layer: "qk-recipes" }],
  ["qk-date-range-picker__panel", ["[&[data-scope=popover]]:border [&[data-scope=popover]]:border-qk-border-subtle", {
    "--qk-popover-padding": "0px",
    "--qk-popover-shadow": "var(--qk-elevation-raised)",
    width: "calc(var(--qk-calendar-cell-size) * 7 * var(--qk-calendar-month-count) + (var(--qk-space-inline-tight) * 4) * (var(--qk-calendar-month-count) - 1) + var(--qk-space-inline-tight) * 4 + var(--qk-border-width-default) * 2)",
    "max-width": "calc(100vw - var(--qk-space-inline-tight) * 4)",
    "max-height": "min(var(--qk-picker-available-height, 100vh), calc(100vh - var(--qk-space-inline-tight) * 4))"
  }], { layer: "qk-recipes" }]
] satisfies UserShortcuts;
/** Range field classes exported for static styles and the token atlas. */
export const dateRangePickerRecipeCatalog = Object.freeze(dateRangePickerShortcuts.map(shortcut => shortcut[0]));
