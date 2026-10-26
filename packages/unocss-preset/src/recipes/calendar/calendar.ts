import type { UserShortcuts } from "@unocss/core";
import { calendarDensityShortcuts } from "./density";
const hover = "[&:not([aria-disabled=true]):not(:disabled):not([data-selected]):hover]:bg-qk-surface-hover";
const focus = "[outline:none] focus-visible:bg-qk-surface-hover";
const interactive = `inline-flex items-center justify-center cursor-pointer select-none rounded-qk-control border-0 bg-transparent p-0 text-qk-text-primary [outline:none] transition-colors duration-[var(--qk-motion-control-duration)] ease-[var(--qk-motion-standard-easing)] motion-reduce:transition-none ${hover} ${focus} disabled:cursor-not-allowed disabled:text-qk-text-disabled [&[aria-disabled=true]]:cursor-not-allowed [&[aria-disabled=true]]:text-qk-text-disabled`;
const selection = "[&[data-selected]]:bg-qk-action-primary [&[data-selected]]:text-qk-action-foreground [&[data-in-range]:not([data-selected])]:bg-qk-action-soft-hover [&[data-in-range]:not([data-selected])]:rounded-none [&[data-in-hover-range]:not([data-selected])]:bg-qk-action-soft [&[data-in-hover-range]:not([data-selected])]:rounded-none [&[data-outside-range]:not([data-selected])]:text-qk-text-tertiary [&[data-unavailable]]:line-through";
// Hit targets may fill the column; hover, focus and selection share one square paint layer.
const dayInteraction = interactive.replace(hover, "").replace(focus, "") + " [&:not([aria-disabled=true]):not(:disabled):not([data-selected]):hover]:before:bg-qk-surface-hover [outline:none] focus-visible:before:bg-qk-surface-hover focus-visible:underline focus-visible:underline-offset-4";
const daySelection = selection.replace('[&[data-selected]]:bg-qk-action-primary', '') + " relative isolate before:content-[''] before:absolute before:left-1/2 before:top-1/2 before:-translate-x-1/2 before:-translate-y-1/2 before:w-[var(--qk-calendar-cell-size)] before:h-[var(--qk-calendar-cell-size)] before:rounded-qk-control before:pointer-events-none before:z--1 before:transition-colors before:duration-[var(--qk-motion-control-duration)] before:ease-[var(--qk-motion-standard-easing)] motion-reduce:before:transition-none [&[data-selected]]:before:bg-qk-action-primary [&[data-today]]:after:content-[''] [&[data-today]]:after:absolute [&[data-today]]:after:bottom-1 [&[data-today]]:after:left-1/2 [&[data-today]]:after:-translate-x-1/2 [&[data-today]]:after:size-0.5 [&[data-today]]:after:rounded-full [&[data-today]]:after:bg-current";
const rangeEdges = [
  '[&[data-selected]]:rounded-none',
  '[&[data-range-start]:not([data-range-end])]:[background-image:linear-gradient(to_right,transparent_50%,var(--qk-color-action-soft-hover)_50%)]',
  '[&[data-range-end]:not([data-range-start])]:[background-image:linear-gradient(to_left,transparent_50%,var(--qk-color-action-soft-hover)_50%)]',
  '[&[dir=rtl][data-range-start]:not([data-range-end])]:[background-image:linear-gradient(to_left,transparent_50%,var(--qk-color-action-soft-hover)_50%)]',
  '[&[dir=rtl][data-range-end]:not([data-range-start])]:[background-image:linear-gradient(to_right,transparent_50%,var(--qk-color-action-soft-hover)_50%)]'
].join(' ');
/** Calendar geometry and states consume shared control and semantic theme roles. */
export const calendarShortcuts = [
  ["qk-calendar", ["min-w-0 w-full p-2 text-qk-text-primary", { "max-width": "calc(var(--qk-calendar-cell-size) * 7 * var(--qk-calendar-month-count) + (var(--qk-space-inline-tight) * 4) * (var(--qk-calendar-month-count) - 1) + var(--qk-space-inline-tight) * 4)", "box-sizing": "border-box" }], { layer: "qk-recipes" }],
  ...calendarDensityShortcuts("qk-calendar"),
  ["qk-calendar__button", [{ height: "var(--qk-calendar-cell-size)", "font-size": "inherit", "line-height": "inherit" }], { layer: "qk-recipes" }],
  ["qk-calendar__view", "grid gap-qk-inline [&[hidden]]:hidden", { layer: "qk-recipes" }],
  ["qk-calendar__navigation", "flex items-center justify-between gap-qk-inline", { layer: "qk-recipes" }],
  ["qk-calendar__navigation-button", [interactive, { width: "var(--qk-calendar-cell-size)" }], { layer: "qk-recipes" }],
  ["qk-calendar__heading", [interactive, "flex-1 font-medium"], { layer: "qk-recipes" }],
  ["qk-calendar__title", "inline-flex flex-1 items-center justify-center font-medium", { layer: "qk-recipes" }],
  ["qk-calendar__error", "m-0 mt-qk-inline text-qk-helper text-qk-danger-text", { layer: "qk-recipes" }],
  ["qk-calendar__months", "flex flex-wrap justify-center gap-4", { layer: "qk-recipes" }],
  ["qk-calendar__month", [{ width: "calc(var(--qk-calendar-cell-size) * 7)", "max-width": "100%" }], { layer: "qk-recipes" }],
  ["qk-calendar__month-label", "m-0 py-qk-inline text-center text-qk-text-secondary", { layer: "qk-recipes" }],
  ["qk-calendar__table", [{ "table-layout": "fixed", "border-collapse": "collapse", width: "100%" }], { layer: "qk-recipes" }],
  ["qk-calendar__weekday", ["p-0 text-center text-qk-helper text-qk-text-secondary font-normal", { height: "var(--qk-calendar-cell-size)" }], { layer: "qk-recipes" }],
  ["qk-calendar__cell", ["p-0 text-center", { height: "var(--qk-calendar-cell-size)" }], { layer: "qk-recipes" }],
  ["qk-calendar__day", [dayInteraction, daySelection, rangeEdges, { width: "var(--qk-calendar-cell-size)" }], { layer: "qk-recipes" }],
  ["qk-calendar__periods", [{ width: "calc(var(--qk-calendar-cell-size) * 7)", height: "calc(var(--qk-calendar-cell-size) * 7)" }], { layer: "qk-recipes" }],
  ["qk-calendar__period", [interactive, selection, "w-full"], { layer: "qk-recipes" }],
  ["qk-calendar__footer", "mt-2 text-qk-helper text-qk-text-secondary", { layer: "qk-recipes" }]
] satisfies UserShortcuts;
/** Public calendar recipe classes included in emitted CSS and token discovery. */
export const calendarRecipeCatalog = Object.freeze(calendarShortcuts.map(shortcut => shortcut[0]));
