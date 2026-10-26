import type { StaticShortcut } from "@unocss/core";
import { timeRangePickerShortcuts } from "../time-range-picker/time-range-picker";
/** Date/time tabs reuse bounded panel geometry, preserving separate calendar density. */
export const dateTimePickerShortcuts: StaticShortcut[] = [
  ...timeRangePickerShortcuts.filter(([name]) => name.endsWith("__tabs"))
    .map<StaticShortcut>(([name, value, meta]) => [name.replace("qk-time-range-picker", "qk-date-time-picker"), value, meta ?? { layer: "qk-recipes" }]),
  ["qk-date-time-picker__panel", [{ width: "max-content" }], { layer: "qk-recipes" }],
  ["qk-date-time-picker__desktop", "flex min-h-0 items-stretch gap-3 overflow-y-auto overscroll-contain [&>.qk-time-picker\\_\\_columns]:border-l [&>.qk-time-picker\\_\\_columns]:border-solid [&>.qk-time-picker\\_\\_columns]:border-qk-border-subtle [&>.qk-time-picker\\_\\_columns]:pl-3 [&>.qk-time-picker\\_\\_columns]:pt-1", { layer: "qk-recipes" }],
  ["qk-date-time-picker__year", [{ "min-width": "4ch" }], { layer: "qk-recipes" }],
  ["qk-date-time-picker__space", [{ "white-space": "pre" }], { layer: "qk-recipes" }],
  ["qk-date-time-picker__calendar", "min-h-0 overflow-y-auto flex justify-center [&>[data-scope=date-picker]]:p-0", { layer: "qk-recipes" }]
];
/** CSS emission and token discovery consume the same recipe inventory. */
export const dateTimePickerRecipeCatalog = Object.freeze(dateTimePickerShortcuts.map(shortcut => shortcut[0]));
