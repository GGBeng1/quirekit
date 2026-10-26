import type { StaticShortcut } from "@unocss/core";
import { dateRangePickerShortcuts } from "../date-range-picker/date-range-picker";
/** Time and date range fields share endpoint wrapping and control sizes; popup content stays independently owned. */
export const timeRangePickerShortcuts: StaticShortcut[] = [...dateRangePickerShortcuts
  .filter(([name]) => !name.endsWith("__panel") && !name.endsWith("__status"))
  .map<StaticShortcut>(([name, value, meta]) => [name.replace("qk-date-range-picker", "qk-time-range-picker"), value, meta ?? { layer: "qk-recipes" }]),
  ["qk-time-range-picker__tabs", ["[&[data-scope=tabs]]:grid min-h-0 gap-qk-inline [&>div:last-child]:min-h-0 [&>div:last-child]:grid [&_[data-scope=tabs][data-part=content]]:min-h-0 [&_[data-scope=tabs][data-part=content]]:p-0 [&_[data-scope=tabs][data-part=content]:not([hidden])]:grid", { "grid-template-rows": "auto minmax(0, 1fr)" }], { layer: "qk-recipes" }]
];
/** Static styles and token discovery use the same range-field class catalog. */
export const timeRangePickerRecipeCatalog = Object.freeze(timeRangePickerShortcuts.map(shortcut => shortcut[0]));
