import { choiceSizeShortcuts, controlSizeShortcuts } from "./control/sizes";
import type { UserShortcuts } from "@unocss/core";

/** UnoCSS preset 发布的 RadioGroup anatomy 类。 */
export const radioGroupRecipeCatalog = Object.freeze([
  "qk-radio-group",
  "qk-radio-group--horizontal",
  "qk-radio-group--vertical",
  "qk-radio-group--xs",
  "qk-radio-group--sm",
  "qk-radio-group--md",
  "qk-radio-group--lg",
  "qk-radio-group--xl",
  "qk-radio-group--invalid",
  "qk-radio-group--disabled",
  "qk-radio-group__label",
  "qk-radio-group__required",
  "qk-radio-group__items",
  "qk-radio-group__items--horizontal",
  "qk-radio-group__items--vertical",
  "qk-radio-group__item",
  "qk-radio-group__item--xs",
  "qk-radio-group__item--sm",
  "qk-radio-group__item--md",
  "qk-radio-group__item--lg",
  "qk-radio-group__item--xl",
  "qk-radio-group__control",
  "qk-radio-group__control--sm",
  "qk-radio-group__control--md",
  "qk-radio-group__mark",
  "qk-radio-group__mark--selected",
  "qk-radio-group__content",
  "qk-radio-group__item-label",
  "qk-radio-group__description"
]);

/** RadioGroup 已批准 anatomy、方向、尺寸与状态的 UnoCSS shortcuts。 */
export const radioGroupShortcuts = [
  ...controlSizeShortcuts("qk-radio-group", "content"),
  ...choiceSizeShortcuts("qk-radio-group__item"),
  ["qk-radio-group", "grid min-w-0 gap-2", { layer: "qk-recipes" }],
  ["qk-radio-group--horizontal", "", { layer: "qk-recipes" }],
  ["qk-radio-group--vertical", "", { layer: "qk-recipes" }],
  ["qk-radio-group--invalid", "[&_.qk-radio-group\\_\\_control:not([data-disabled])]:border-qk-danger-border", { layer: "qk-recipes" }],
  ["qk-radio-group--disabled", "[&_.qk-radio-group\\_\\_description]:text-qk-text-disabled", { layer: "qk-recipes" }],
  ["qk-radio-group__label", "font-medium text-qk-text-secondary", { layer: "qk-recipes" }],
  ["qk-radio-group__required", "ms-0.5 text-qk-danger-foreground", { layer: "qk-recipes" }],
  ["qk-radio-group__items", "flex min-w-0 gap-3", { layer: "qk-recipes" }],
  ["qk-radio-group__items--horizontal", "flex-row flex-wrap items-start", { layer: "qk-recipes" }],
  ["qk-radio-group__items--vertical", "flex-col items-stretch", { layer: "qk-recipes" }],
  ["qk-radio-group__item", "inline-flex min-w-0 cursor-pointer select-none items-start gap-2 text-qk-text-primary data-[disabled]:cursor-not-allowed data-[disabled]:text-qk-text-disabled [&[data-disabled]_.qk-radio-group\\_\\_description]:text-qk-text-disabled", { layer: "qk-recipes" }],
  [
    "qk-radio-group__control",
    [
      "size-[var(--qk-choice-size)] grid shrink-0 place-items-center rounded-full border border-qk-border-default bg-qk-surface-page text-qk-action-primary data-[disabled]:text-qk-text-disabled transition-colors data-[hover]:[&:not([data-disabled])]:border-qk-border-strong [outline:none] data-[focus-visible]:[&:not([data-disabled])]:[filter:brightness(0.85)] data-[state=checked]:[&:not([data-disabled])]:border-qk-action-primary data-[disabled]:border-qk-border-disabled data-[disabled]:bg-qk-surface-disabled motion-reduce:transition-none",
      { outline: "0", "margin-top": "max(0px, calc((var(--qk-control-size-line-height) - var(--qk-choice-size)) / 2))" }
    ],
    { layer: "qk-recipes" }
  ],
  ["qk-radio-group__control--sm", "size-[var(--qk-choice-size)]", { layer: "qk-recipes" }],
  ["qk-radio-group__control--md", "size-[var(--qk-choice-size)]", { layer: "qk-recipes" }],
  ["qk-radio-group__mark", "size-[calc(var(--qk-choice-size)/2)] scale-0 rounded-full bg-current transition-transform motion-reduce:transition-none", { layer: "qk-recipes" }],
  ["qk-radio-group__mark--selected", "scale-100", { layer: "qk-recipes" }],
  ["qk-radio-group__content", "grid min-w-0 gap-0.5", { layer: "qk-recipes" }],
  ["qk-radio-group__item-label", "min-w-0 cursor-inherit font-medium text-current", { layer: "qk-recipes" }],
  ["qk-radio-group__description", "min-w-0 text-qk-helper leading-qk-helper text-qk-text-tertiary", { layer: "qk-recipes" }]
] satisfies UserShortcuts;
