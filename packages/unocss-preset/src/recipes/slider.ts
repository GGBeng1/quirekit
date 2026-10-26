import type { UserShortcuts } from "@unocss/core";

/** UnoCSS preset 发布的 Slider anatomy 类。 */
export const sliderRecipeCatalog = Object.freeze([
  "qk-slider", "qk-slider--horizontal", "qk-slider--vertical",
  "qk-slider__header", "qk-slider__label", "qk-slider__value",
  "qk-slider__control", "qk-slider__track", "qk-slider__range", "qk-slider__thumb"
]);

/** Slider 已批准 anatomy、方向与状态的 UnoCSS shortcuts。 */
export const sliderShortcuts = [
  ["qk-slider", "grid min-w-0 gap-2 text-qk-text-primary data-[disabled]:text-qk-text-disabled", { layer: "qk-recipes" }],
  ["qk-slider--horizontal", "w-full", { layer: "qk-recipes" }],
  ["qk-slider--vertical", "h-56 w-fit", { layer: "qk-recipes" }],
  ["qk-slider__header", "flex min-w-0 items-center justify-between gap-3 text-qk-compact leading-qk-compact", { layer: "qk-recipes" }],
  ["qk-slider__label", "min-w-0 font-medium text-qk-text-secondary", { layer: "qk-recipes" }],
  ["qk-slider__value", "shrink-0 tabular-nums text-qk-text-tertiary", { layer: "qk-recipes" }],
  ["qk-slider__control", "relative flex cursor-pointer touch-none select-none items-center data-[readonly]:cursor-default data-[disabled]:cursor-not-allowed data-[orientation=horizontal]:h-5 data-[orientation=horizontal]:w-full data-[orientation=vertical]:h-full data-[orientation=vertical]:w-5 data-[orientation=vertical]:justify-center", { layer: "qk-recipes" }],
  ["qk-slider__track", "relative overflow-hidden rounded-full bg-qk-surface-selected data-[orientation=horizontal]:h-1.5 data-[orientation=horizontal]:w-full data-[orientation=vertical]:h-full data-[orientation=vertical]:w-1.5", { layer: "qk-recipes" }],
  ["qk-slider__range", "bg-qk-action-primary data-[disabled]:bg-qk-border-disabled data-[orientation=horizontal]:h-full data-[orientation=vertical]:w-full", { layer: "qk-recipes" }],
  ["qk-slider__thumb", "grid size-4 cursor-grab place-items-center rounded-full border-2 border-solid border-qk-action-primary bg-qk-surface-page transition-colors data-[dragging]:cursor-grabbing [outline:none] focus-visible:bg-qk-action-soft data-[readonly]:cursor-default data-[disabled]:cursor-not-allowed data-[disabled]:border-qk-border-disabled data-[disabled]:bg-qk-surface-disabled motion-reduce:transition-none", { layer: "qk-recipes" }]
] satisfies UserShortcuts;
