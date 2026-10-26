import { choiceSizeShortcuts } from "./control/sizes";
import type { UserShortcuts } from "@unocss/core";

/** UnoCSS preset 发布的 Checkbox anatomy 类。 */
export const checkboxRecipeCatalog = Object.freeze([
  "qk-checkbox",
  "qk-checkbox--xs",
  "qk-checkbox--sm",
  "qk-checkbox--md",
  "qk-checkbox--lg",
  "qk-checkbox--xl",
  "qk-checkbox--invalid",
  "qk-checkbox--disabled",
  "qk-checkbox__control",
  "qk-checkbox__control--sm",
  "qk-checkbox__control--md",
  "qk-checkbox__indicator",
  "qk-checkbox__mixed-mark",
  "qk-checkbox__content",
  "qk-checkbox__label",
  "qk-checkbox__required",
  "qk-checkbox__description"
]);

/** Checkbox 已批准 anatomy、尺寸与交互状态的 UnoCSS shortcuts。 */
export const checkboxShortcuts = [
  ...choiceSizeShortcuts("qk-checkbox"),
  // Contain the absolute hidden input so focus and fragment restoration cannot scroll the outer page.
  [
    "qk-checkbox",
    "relative inline-flex min-w-0 cursor-pointer select-none items-start gap-2 text-qk-text-primary data-[disabled]:cursor-not-allowed data-[disabled]:text-qk-text-disabled",
    { layer: "qk-recipes" }
  ],
  ["qk-checkbox--invalid", "[&_.qk-checkbox\\_\\_control:not([data-disabled])]:border-qk-danger-border", { layer: "qk-recipes" }],
  ["qk-checkbox--disabled", "[&_.qk-checkbox\\_\\_description]:text-qk-text-disabled", { layer: "qk-recipes" }],
  [
    "qk-checkbox__control",
    [
      "size-[var(--qk-choice-size)] grid shrink-0 place-items-center border border-solid border-qk-border-default bg-qk-surface-page text-qk-action-text transition-colors data-[hover]:[&:not([data-disabled])]:border-qk-border-strong [outline:none] data-[focus-visible]:[&:not([data-disabled])]:[filter:brightness(0.85)] data-[state=checked]:[&:not([data-disabled])]:border-qk-action-primary data-[state=checked]:[&:not([data-disabled])]:bg-qk-action-primary data-[state=checked]:[&:not([data-disabled])]:text-qk-text-inverse data-[state=indeterminate]:[&:not([data-disabled])]:border-qk-action-primary data-[state=indeterminate]:[&:not([data-disabled])]:bg-qk-action-primary data-[state=indeterminate]:[&:not([data-disabled])]:text-qk-text-inverse data-[disabled]:border-qk-border-disabled data-[disabled]:bg-qk-surface-disabled data-[disabled]:text-qk-text-disabled motion-reduce:transition-none",
      { "border-radius": "var(--qk-radius-control)", outline: "0", "margin-top": "max(0px, calc((var(--qk-control-size-line-height) - var(--qk-choice-size)) / 2))" }
    ],
    { layer: "qk-recipes" }
  ],
  ["qk-checkbox__control--sm", "size-[var(--qk-choice-size)]", { layer: "qk-recipes" }],
  ["qk-checkbox__control--md", "size-[var(--qk-choice-size)]", { layer: "qk-recipes" }],
  ["qk-checkbox__indicator", "grid size-full place-items-center [&>.qk-icon]:shrink-0", { layer: "qk-recipes" }],
  ["qk-checkbox__mixed-mark", "h-0.5 w-2.5 rounded-full bg-current", { layer: "qk-recipes" }],
  ["qk-checkbox__content", "grid min-w-0 gap-0.5", { layer: "qk-recipes" }],
  ["qk-checkbox__label", "min-w-0 cursor-inherit font-medium text-current", { layer: "qk-recipes" }],
  ["qk-checkbox__required", "ms-0.5 text-qk-danger-foreground", { layer: "qk-recipes" }],
  ["qk-checkbox__description", "min-w-0 text-qk-helper leading-qk-helper text-qk-text-tertiary", { layer: "qk-recipes" }]
] satisfies UserShortcuts;
