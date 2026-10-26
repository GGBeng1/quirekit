import type { UserShortcuts } from "@unocss/core";

/** Visual selection regions composed on the shared selection task frame. */
export const presetPickerRecipeCatalog = Object.freeze([
  "qk-preset-picker__surface", "qk-preset-picker__surface--desktop", "qk-preset-picker__surface--bottom",
  "qk-preset-picker__header", "qk-preset-picker__options", "qk-preset-picker__footer-content", "qk-preset-picker__status", "qk-preset-picker__actions", "qk-preset-picker__target"
]);

/** Gives Gallery sufficient preview width while preserving the shared scroll owner. */
export const presetPickerShortcuts = [
  ["qk-preset-picker__surface", "min-w-0", { layer: "qk-recipes" }],
  ["qk-preset-picker__surface--desktop", "[&.qk-choice-picker\\_\\_surface--desktop.qk-popover\\_\\_content]:w-[min(40rem,calc(100vw-1rem))]", { layer: "qk-recipes" }],
  ["qk-preset-picker__surface--bottom", "[overscroll-behavior:contain]", { layer: "qk-recipes" }],
  ["qk-preset-picker__header", "flex min-w-0 items-start justify-between gap-qk-group border-0 border-b border-solid border-qk-border-subtle p-qk-surface", { layer: "qk-recipes" }],
  ["qk-preset-picker__options", "min-w-0 p-qk-inline", { layer: "qk-recipes" }],
  ["qk-preset-picker__target", "[.qk-preset-picker\\_\\_surface--bottom_&]:min-w-[var(--qk-control-touch-target)] [.qk-preset-picker\\_\\_surface--bottom_&]:min-h-[var(--qk-control-touch-target)] [@media(pointer:coarse)]:min-w-[var(--qk-control-touch-target)] [@media(pointer:coarse)]:min-h-[var(--qk-control-touch-target)]", { layer: "qk-recipes" }],
  ["qk-preset-picker__footer-content", "flex flex-wrap items-center justify-between gap-qk-surface-compact", { layer: "qk-recipes" }],
  ["qk-preset-picker__status", "qk-choice-picker__status", { layer: "qk-recipes" }],
  ["qk-preset-picker__actions", "qk-choice-picker__actions", { layer: "qk-recipes" }]
] satisfies UserShortcuts;
