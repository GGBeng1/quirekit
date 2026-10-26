import type { UserShortcuts } from "@unocss/core";

/** UnoCSS preset 发布的 Switch anatomy 类。 */
export const switchRecipeCatalog = Object.freeze([
  "qk-switch",
  "qk-switch--sm",
  "qk-switch--md",
  "qk-switch--invalid",
  "qk-switch--disabled",
  "qk-switch--described",
  "qk-switch__content",
  "qk-switch__label",
  "qk-switch__required",
  "qk-switch__description",
  "qk-switch__control",
  "qk-switch__control--sm",
  "qk-switch__control--md",
  "qk-switch__thumb",
  "qk-switch__thumb--sm",
  "qk-switch__thumb--md"
]);

/** Switch 已批准 anatomy、尺寸与状态的 UnoCSS shortcuts。 */
export const switchShortcuts = [
  ["qk-switch", "relative inline-flex min-w-0 cursor-pointer select-none items-center gap-3 text-qk-text-primary data-[disabled]:cursor-not-allowed data-[disabled]:text-qk-text-disabled", { layer: "qk-recipes" }],
  ["qk-switch--sm", "min-h-[var(--qk-control-default)] text-qk-compact leading-qk-compact", { layer: "qk-recipes" }],
  ["qk-switch--md", "min-h-[var(--qk-control-regular)] text-qk-body leading-qk-body", { layer: "qk-recipes" }],
  ["qk-switch--invalid", "[&_.qk-switch\\_\\_control]:border-qk-danger-border", { layer: "qk-recipes" }],
  ["qk-switch--disabled", "[&_.qk-switch\\_\\_description]:text-qk-text-disabled", { layer: "qk-recipes" }],
  // A description wraps under the label, so the track aligns with the label's first line instead of the block center.
  ["qk-switch--described", "items-start [&_.qk-switch\\_\\_control]:mt-0.5", { layer: "qk-recipes" }],
  ["qk-switch__content", "grid min-w-0 flex-1 gap-0.5", { layer: "qk-recipes" }],
  ["qk-switch__label", "min-w-0 cursor-inherit font-medium text-current", { layer: "qk-recipes" }],
  ["qk-switch__required", "ms-0.5 text-qk-danger-foreground", { layer: "qk-recipes" }],
  ["qk-switch__description", "min-w-0 text-qk-helper leading-qk-helper text-qk-text-tertiary", { layer: "qk-recipes" }],
  [
    "qk-switch__control",
    [
      "inline-flex shrink-0 cursor-inherit items-center rounded-full border border-qk-border-default bg-qk-surface-selected p-0 transition-colors data-[hover]:border-qk-border-strong [outline:none] data-[focus-visible]:[&:not([data-disabled])]:[filter:brightness(0.85)] data-[state=checked]:border-qk-action-primary data-[state=checked]:bg-qk-action-primary data-[disabled]:border-qk-border-disabled data-[disabled]:bg-qk-surface-disabled data-[disabled]:data-[state=checked]:border-transparent data-[disabled]:data-[state=checked]:[background:color-mix(in_srgb,var(--qk-color-action-primary)_40%,var(--qk-color-surface-page))] motion-reduce:transition-none",
      { outline: "0" }
    ],
    { layer: "qk-recipes" }
  ],
  ["qk-switch__control--sm", "h-4 w-7", { layer: "qk-recipes" }],
  ["qk-switch__control--md", "h-[18px] w-8", { layer: "qk-recipes" }],
  // Match the track's outer height and overlap its 1px edge, preserving one shared contour at either end.
  ["qk-switch__thumb", "-ml-px block shrink-0 rounded-full border [border-color:inherit] bg-qk-surface-page shadow-qk-raised transition-transform data-[disabled]:shadow-none motion-reduce:transition-none", { layer: "qk-recipes" }],
  ["qk-switch__thumb--sm", "size-4 data-[state=checked]:translate-x-3", { layer: "qk-recipes" }],
  ["qk-switch__thumb--md", "size-[18px] data-[state=checked]:translate-x-[14px]", { layer: "qk-recipes" }]
] satisfies UserShortcuts;
