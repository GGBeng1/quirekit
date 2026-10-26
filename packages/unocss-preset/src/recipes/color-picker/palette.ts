import { controlSizeShortcuts } from "../control/sizes";
import type { UserShortcuts } from "@unocss/core";
import { resetInteractive } from "./shared";

/** Color Picker 触发器与快捷色板 shortcuts。 */
export const colorPickerPaletteShortcuts = [
  ["qk-color-picker__trigger", [
    "relative inline-grid shrink-0 cursor-pointer place-items-center overflow-hidden border border-qk-border-default bg-qk-surface-raised p-[3px] [outline:none] focus-visible:bg-qk-surface-selected disabled:cursor-not-allowed disabled:border-qk-border-disabled disabled:bg-qk-surface-disabled",
    { ...resetInteractive, width: "var(--qk-control-size-height)", "border-radius": "var(--qk-radius-control)" }
  ], { layer: "qk-recipes" }],
  ...controlSizeShortcuts("qk-color-picker__trigger"),
  ["qk-color-picker__trigger-grid", "absolute inset-[3px]", { layer: "qk-recipes" }],
  ["qk-color-picker__trigger-swatch", "relative size-full rounded-[3px]", { layer: "qk-recipes" }],
  ["qk-color-picker__trigger-none", [
    "relative size-full overflow-hidden bg-qk-surface-page",
    {
      "border-radius": "4px",
      background: "linear-gradient(135deg, transparent 46%, var(--qk-color-danger-text) 47%, var(--qk-color-danger-text) 53%, transparent 54%), var(--qk-color-surface-page)"
    }
  ], { layer: "qk-recipes" }],
  ["qk-color-picker__positioner", [
    { "--z-index": "var(--qk-color-picker-layer,var(--qk-layer-overlay)) !important", "z-index": "var(--qk-color-picker-layer,var(--qk-layer-overlay))" }
  ], { layer: "qk-recipes" }],
  ["qk-color-picker__positioner--modal", [{ "--qk-color-picker-layer": "calc(var(--qk-layer-modal) + 1)" }], { layer: "qk-recipes" }],
  ["qk-color-picker__content", [
    "relative max-w-[calc(100vw-16px)] overflow-visible border-0 text-qk-compact text-qk-text-primary",
    {
      outline: "0",
      width: "var(--qk-color-picker-content-width,calc(var(--qk-color-picker-columns,10) * 26px - 6px + var(--qk-space-surface) + var(--qk-space-surface)))",
      "border-radius": "var(--qk-radius-overlay)",
      "font-family": "var(--qk-typography-body-font-family)",
      "font-size": "var(--qk-type-compact-font-size)",
      "line-height": "var(--qk-type-compact-line-height)"
    }
  ], { layer: "qk-recipes" }],
  ["qk-color-picker__content--editor", [], { layer: "qk-recipes" }],
  ["qk-color-picker__palette", ["grid shrink-0 gap-qk-inline overflow-hidden p-qk-surface", {
    width: "var(--qk-color-picker-palette-width,100%)"
  }], { layer: "qk-recipes" }],
  ["qk-color-picker__current", [
    "flex w-full cursor-default items-center gap-qk-inline border-0 bg-transparent py-qk-inline-tight text-left text-qk-text-primary",
    { ...resetInteractive, "min-height": "var(--qk-control-default)" }
  ], { layer: "qk-recipes" }],
  ["qk-color-picker__current-swatch", ["shrink-0 border-0", { width: "20px", height: "20px", "border-radius": "4px" }], { layer: "qk-recipes" }],
  ["qk-color-picker__current-label", "min-w-0 flex-1 truncate text-qk-compact", { layer: "qk-recipes" }],
  ["qk-color-picker__section", "grid gap-[6px] py-[2px]", { layer: "qk-recipes" }],
  ["qk-color-picker__section-title", "m-0 text-qk-helper font-medium text-qk-text-tertiary", { layer: "qk-recipes" }],
  ["qk-color-picker__recent-grid", ["grid", { "grid-template-columns": "repeat(var(--qk-color-picker-columns, 10), 20px)", gap: "6px" }], { layer: "qk-recipes" }],
  ["qk-color-picker__palette-grid", ["grid", { "grid-template-columns": "repeat(var(--qk-color-picker-columns, 10), 20px)", gap: "6px" }], { layer: "qk-recipes" }],
  ["qk-color-picker__swatch-trigger", [
    "relative grid cursor-pointer place-items-center overflow-visible border-0 border-solid bg-transparent p-0 transition-opacity enabled:hover:opacity-80 disabled:cursor-not-allowed disabled:opacity-45 data-[state=checked]:border data-[state=checked]:border-current data-[state=checked]:p-[2px]",
    { ...resetInteractive, width: "20px", height: "20px", "border-radius": "4px" }
  ], { layer: "qk-recipes" }],
  ["qk-color-picker__swatch", ["size-full border-0", { "border-radius": "4px" }], { layer: "qk-recipes" }],
  ["qk-color-picker__swatch--white", "border border-solid border-qk-border-subtle", { layer: "qk-recipes" }],
  ["qk-color-picker__palette-actions", "grid gap-qk-inline border-0 border-t border-solid border-qk-border-subtle pt-[8px]", { layer: "qk-recipes" }],
  ["qk-color-picker__reset", [
    "relative flex cursor-pointer items-center gap-qk-inline border-0 bg-transparent text-left text-qk-compact text-qk-text-primary enabled:hover:bg-qk-surface-hover disabled:cursor-not-allowed disabled:text-qk-text-disabled data-[state=checked]:bg-qk-surface-selected",
    { ...resetInteractive, "min-height": "var(--qk-control-regular)", "border-radius": "var(--qk-radius-control)" }
  ], { layer: "qk-recipes" }],
  ["qk-color-picker__none-swatch", [
    "relative shrink-0 overflow-hidden border border-solid border-qk-border-subtle bg-qk-surface-page",
    {
      width: "20px", height: "20px", "border-radius": "4px",
      background: "linear-gradient(135deg, transparent 46%, var(--qk-color-danger-text) 47%, var(--qk-color-danger-text) 53%, transparent 54%), var(--qk-color-surface-page)"
    }
  ], { layer: "qk-recipes" }],
  ["qk-color-picker__more-icon", "size-qk-icon shrink-0 fill-none stroke-current stroke-[1.75] [stroke-linecap:round] [stroke-linejoin:round]", { layer: "qk-recipes" }],
  ["qk-color-picker__more", [
    "relative flex cursor-pointer items-center justify-between border-0 bg-transparent text-left text-qk-compact text-qk-text-primary enabled:hover:bg-qk-surface-hover disabled:cursor-not-allowed disabled:text-qk-text-disabled",
    {
      ...resetInteractive,
      width: "calc(100% + var(--qk-space-inline) * 2)",
      "min-height": "var(--qk-control-regular)",
      "margin-inline": "calc(var(--qk-space-inline) * -1)",
      "padding-inline": "var(--qk-space-inline)",
      "border-radius": "var(--qk-radius-control)"
    }
  ], { layer: "qk-recipes" }]
] satisfies UserShortcuts;
