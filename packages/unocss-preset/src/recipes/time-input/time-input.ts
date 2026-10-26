import type { StaticShortcut } from "@unocss/core";
import { dateInputShortcuts } from "../date-input/date-input";
/** Time and date fields share segment spacing, states, and control geometry. */
export const timeInputShortcuts = [...dateInputShortcuts.map<StaticShortcut>(([name, value, meta]) => [name.replace("qk-date-input", "qk-time-input"), value, meta ?? { layer: "qk-recipes" }]), ["qk-time-input__period", "px-qk-inline-tight", { layer: "qk-recipes" }], ["qk-time-input__direction-marker", "hidden", { layer: "qk-recipes" }]] satisfies StaticShortcut[];
/** Public time-input classes included in emitted CSS and token discovery. */
export const timeInputRecipeCatalog = Object.freeze(timeInputShortcuts.map(shortcut => shortcut[0]));
