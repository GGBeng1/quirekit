import type { UserShortcuts } from "@unocss/core";
import { resetInteractive } from "./shared";

/** Color Picker 精确编辑器 shortcuts。 */
export const colorPickerEditorShortcuts = [
  ["qk-color-picker__editor-positioner", [{ "z-index": "1" }], { layer: "qk-recipes" }],
  ["qk-color-picker__editor-panel", [
    "relative w-[304px] shrink-0 overflow-hidden border-0 bg-qk-surface-overlay shadow-qk-overlay",
    { "border-radius": "var(--qk-radius-overlay)", outline: "0" }
  ], { layer: "qk-recipes" }],
  ["qk-color-picker__editor", "grid w-full shrink-0 gap-qk-surface border-0 p-qk-surface", { layer: "qk-recipes" }],
  ["qk-color-picker__editor-header", "hidden", { layer: "qk-recipes" }],
  ["qk-color-picker__back", [
    "flex cursor-pointer items-center gap-qk-inline border-0 bg-transparent px-qk-inline text-qk-text-secondary hover:bg-qk-surface-hover hover:text-qk-text-primary",
    { ...resetInteractive, "min-height": "var(--qk-control-default)", "border-radius": "var(--qk-radius-control)" }
  ], { layer: "qk-recipes" }],
  ["qk-color-picker__area", ["relative h-[232px] w-full cursor-crosshair overflow-hidden", { "border-radius": "6px" }], { layer: "qk-recipes" }],
  ["qk-color-picker__area-background", "absolute inset-0 size-full", { layer: "qk-recipes" }],
  ["qk-color-picker__area-thumb", [
    "size-[14px] rounded-full border-2 border-white",
    { ...resetInteractive, transform: "translate(-50%, -50%)" }
  ], { layer: "qk-recipes" }],
  ["qk-color-picker__slider-row", "flex items-center gap-qk-inline", { layer: "qk-recipes" }],
  ["qk-color-picker__eye-dropper", [
    "grid size-[32px] shrink-0 cursor-pointer place-items-center border border-qk-border-default bg-qk-surface-page text-qk-text-secondary hover:bg-qk-surface-hover hover:text-qk-text-primary disabled:cursor-not-allowed disabled:text-qk-text-disabled",
    { ...resetInteractive, "border-radius": "6px" }
  ], { layer: "qk-recipes" }],
  ["qk-color-picker__sliders", "grid min-w-0 flex-1 gap-qk-inline", { layer: "qk-recipes" }],
  ["qk-color-picker__slider", [
    "relative flex h-[14px] cursor-pointer items-center",
    { width: "calc(100% - 14px)", "margin-inline": "7px" }
  ], { layer: "qk-recipes" }],
  ["qk-color-picker__slider-track", [
    "h-[10px] shrink-0 overflow-hidden rounded-qk-pill",
    { width: "calc(100% + 14px)", "margin-inline-start": "-7px" }
  ], { layer: "qk-recipes" }],
  ["qk-color-picker__slider-thumb", [
    "size-[14px] rounded-full border-2 border-white",
    { ...resetInteractive, transform: "translate(-50%, -50%)" }
  ], { layer: "qk-recipes" }],
  ["qk-color-picker__transparency-grid", "absolute inset-y-[2px] overflow-hidden rounded-qk-pill", { layer: "qk-recipes" }],
  ["qk-color-picker__inputs", "grid grid-cols-[64px_minmax(0,1fr)_56px] items-end gap-qk-inline", { layer: "qk-recipes" }],
  ["qk-color-picker__inputs--without-alpha", "grid-cols-[64px_minmax(0,1fr)]", { layer: "qk-recipes" }],
  ["qk-color-picker__channel-inputs", "grid min-w-0 grid-cols-3 gap-qk-inline-tight", { layer: "qk-recipes" }],
  ["qk-color-picker__input-group", "grid min-w-0 gap-qk-inline-tight text-qk-helper text-qk-text-tertiary", { layer: "qk-recipes" }],
  ["qk-color-picker__input-group--alpha", "w-full", { layer: "qk-recipes" }],
  ["qk-color-picker__format-select", [
    "h-qk-control-regular min-w-0 w-full cursor-pointer border border-qk-border-default bg-qk-surface-page px-qk-inline text-qk-compact text-qk-text-primary focus:border-qk-border-strong",
    { ...resetInteractive, "border-radius": "var(--qk-radius-control)" }
  ], { layer: "qk-recipes" }],
  ["qk-color-picker__input", [
    "h-qk-control-regular min-w-0 w-full border border-qk-border-default bg-qk-surface-page px-qk-inline text-qk-compact text-qk-text-primary focus:border-qk-border-strong",
    { ...resetInteractive, "border-radius": "var(--qk-radius-control)" }
  ], { layer: "qk-recipes" }]
] satisfies UserShortcuts;
