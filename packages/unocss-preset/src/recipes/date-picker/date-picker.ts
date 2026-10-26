import type { UserShortcuts } from "@unocss/core";
import { calendarDensityShortcuts } from "../calendar/density";

/** Popup composition keeps Calendar's own inset and the independent panel density. */
export const datePickerShortcuts = [
  ["qk-date-picker__trigger", "inline-flex shrink-0", { layer: "qk-recipes" }],
  ["qk-date-picker__panel", ["[&[data-scope=popover]]:border [&[data-scope=popover]]:border-qk-border-subtle", {
    "--qk-popover-padding": "0px",
    "--qk-popover-shadow": "var(--qk-elevation-raised)",
    width: "calc(var(--qk-calendar-cell-size) * 7 + var(--qk-space-inline-tight) * 4 + var(--qk-border-width-default) * 2)",
    "max-width": "calc(100vw - var(--qk-space-inline-tight) * 4)"
  }], { layer: "qk-recipes" }],
  ["qk-picker__anchor", "min-w-0 max-w-full [&_button]:border-0 [&_button:focus-visible]:border-0 [&_button]:[outline:none] [&_button:focus-visible]:[outline:none] [&_button]:[box-shadow:none] [&_button:focus-visible]:[box-shadow:none]", { layer: "qk-recipes" }],
  ["qk-picker__sheet", [{ width: "100%", "max-width": "100%", "max-height": "calc(100dvh - max(16px, env(safe-area-inset-top, 0px)))", "grid-template-rows": "auto minmax(0, 1fr)", "--qk-drawer-responsive-width": "100%", "--qk-drawer-max-width": "100%" }], { layer: "qk-recipes" }],
  ["qk-picker__sheet-header", "flex items-center justify-between gap-2 px-3 py-1 border-b border-solid border-qk-border-subtle", { layer: "qk-recipes" }],
  ["qk-picker__close", "qk-drawer__close-trigger qk-drawer__close-trigger--touch", { layer: "qk-recipes" }],
  ["qk-picker__sheet-body", ["min-h-0 overflow-y-auto overscroll-contain [&_.qk-calendar]:max-w-full [&_.qk-calendar]:p-0 [&_.qk-calendar\\_\\_day]:w-full [&_.qk-calendar\\_\\_periods]:w-full [&_.qk-calendar]:[--qk-calendar-cell-size:40px] [&_.qk-calendar\\_\\_month]:w-full [&_.qk-time-picker\\_\\_columns]:w-full [&_.qk-time-picker\\_\\_body]:max-h-none [&_.qk-time-picker\\_\\_footer_button]:min-h-10", {
    width: "100%", "max-width": "100%", "max-height": "none", padding: "8px max(8px, env(safe-area-inset-right, 0px)) max(8px, env(safe-area-inset-bottom, 0px)) max(8px, env(safe-area-inset-left, 0px))",
    "--qk-calendar-cell-size": "40px"
  }], { layer: "qk-recipes" }],
  ["qk-picker__range-editors", "grid grid-cols-2 items-start gap-4 min-h-0 overflow-y-auto overscroll-contain [&>section]:min-w-0 [&>section]:grid [&>section]:gap-2 [&>section+section]:border-l [&>section+section]:border-solid [&>section+section]:border-qk-border-subtle [&>section+section]:pl-4", { layer: "qk-recipes" }],
  ["qk-picker__endpoint-title", "m-0 text-qk-control font-medium text-qk-text-secondary", { layer: "qk-recipes" }],
  ["qk-picker__range-panel", [{ width: "max-content" }], { layer: "qk-recipes" }],
  ...calendarDensityShortcuts("qk-date-picker__panel")
] satisfies UserShortcuts;
/** Public recipe discovery for static CSS and the token atlas. */
export const datePickerRecipeCatalog = Object.freeze(datePickerShortcuts.map(shortcut => shortcut[0]));
