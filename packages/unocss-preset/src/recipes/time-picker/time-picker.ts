import type { UserShortcuts } from "@unocss/core";
/** Time panel geometry derives from shared control, spacing and semantic tokens. */
export const timePickerShortcuts = [
  ["qk-time-picker__trigger", "inline-flex shrink-0", { layer: "qk-recipes" }],
  ["qk-time-picker__panel", ["[&[data-scope=popover]]:border [&[data-scope=popover]]:border-qk-border-subtle", { width: "max-content", "max-width": "calc(100vw - var(--qk-space-surface) * 2)", "max-height": "min(var(--qk-picker-available-height, 100vh), calc(100vh - var(--qk-space-surface) * 2))", "--qk-popover-padding": "calc(var(--qk-space-inline-tight) * 2)", "--qk-popover-shadow": "var(--qk-elevation-raised)" }], { layer: "qk-recipes" }],
  ["qk-time-picker__body", ["grid min-w-0 gap-qk-inline-tight", { "max-height": "calc(min(var(--qk-picker-available-height, 100vh), 100vh - var(--qk-space-surface) * 2) - var(--qk-space-surface) * 2)", "grid-template-rows": "minmax(0, 1fr)", "grid-auto-rows": "max-content" }], { layer: "qk-recipes" }],
  ["qk-time-picker__columns", ["grid gap-qk-inline-tight", { "grid-template-columns": "repeat(var(--qk-time-picker-columns), minmax(0, 1fr))", width: "calc(var(--qk-control-regular) * 2 * var(--qk-time-picker-columns) + var(--qk-space-inline-tight) * (var(--qk-time-picker-columns) - 1))", "min-width": "calc(var(--qk-control-regular) * 5)", "max-width": "100%" }], { layer: "qk-recipes" }],
  // Calendar determines the row height; list contents must not contribute their intrinsic size.
  ["qk-time-picker__columns--calendar", "min-h-0 [contain:size] [&_.qk-time-picker\\_\\_list]:h-full [&_.qk-time-picker\\_\\_list]:max-h-none", { layer: "qk-recipes" }],
  ["qk-time-picker__column", ["grid min-w-0 min-h-0 gap-qk-inline-tight [&>[data-part=root]]:min-h-0 [&>[data-part=root]]:grid-rows-[minmax(0,1fr)]", { "grid-template-rows": "auto minmax(0, 1fr)" }], { layer: "qk-recipes" }],
  ["qk-time-picker__heading", "m-0 text-center text-qk-helper text-qk-text-secondary", { layer: "qk-recipes" }],
  ["qk-time-picker__list", ["[&[data-part=content]]:gap-0 [&[data-part=content]]:p-0 min-h-0", { height: "calc(var(--qk-control-regular) * 6)", "max-height": "min(40vh, 100%)" }], { layer: "qk-recipes" }],
  ["qk-time-picker__option", "[&[data-part=item]]:p-0 [&[data-part=item]]:justify-center [&[data-part=item]]:transition-colors [&[data-part=item]]:duration-[var(--qk-motion-control-duration)] [&[data-part=item]]:ease-[var(--qk-motion-standard-easing)] motion-reduce:[&[data-part=item]]:transition-none", { layer: "qk-recipes" }],
  ["qk-time-picker__unit", "tabular-nums text-qk-control", { layer: "qk-recipes" }],
  ["qk-time-picker__message", "m-0 text-qk-helper text-qk-text-secondary", { layer: "qk-recipes" }],
  ["qk-time-picker__shortcuts", "flex flex-wrap gap-qk-inline-tight", { layer: "qk-recipes" }],
  ["qk-time-picker__footer", "flex items-center gap-qk-inline-tight pt-qk-inline border-t border-solid border-qk-border-subtle", { layer: "qk-recipes" }],
  ["qk-time-picker__spacer", "flex-1", { layer: "qk-recipes" }]
] satisfies UserShortcuts;
/** Static CSS and token discovery share these public recipe classes. */
export const timePickerRecipeCatalog = Object.freeze(timePickerShortcuts.map(shortcut => shortcut[0]));
