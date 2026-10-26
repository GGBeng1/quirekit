import { controlFocusWithin, invalidControlFocusWithin } from "./control/focus";
import { controlSizeShortcuts } from "./control/sizes";
import type { UserShortcuts } from "@unocss/core";

/** UnoCSS preset 发布的 TagsInput anatomy 类。 */
export const tagsInputRecipeCatalog = Object.freeze([
  "qk-tags-input",
  "qk-tags-input--invalid",
  "qk-tags-input--disabled",
  "qk-tags-input--readonly",
  "qk-tags-input__header",
  "qk-tags-input__label",
  "qk-tags-input__required",
  "qk-tags-input__meta",
  "qk-tags-input__control",
  "qk-tags-input__control--xs",
  "qk-tags-input__control--sm",
  "qk-tags-input__control--md",
  "qk-tags-input__control--lg",
  "qk-tags-input__control--xl",

  "qk-tags-input__item",
  "qk-tags-input__item-preview",
  "qk-tags-input__item-text",
  "qk-tags-input__item-input",
  "qk-tags-input__delete",
  "qk-tags-input__input",
  "qk-tags-input__clear",
  "qk-tags-input__message",
  "qk-tags-input__message--error"
]);

/** TagsInput 标签、输入、编辑和状态样式。 */
export const tagsInputShortcuts = [
  ...controlSizeShortcuts("qk-tags-input__control", "min-height"),
  ["qk-tags-input", "grid auto-rows-min content-start min-w-0 gap-qk-inline text-qk-compact leading-qk-compact text-qk-text-primary", { layer: "qk-recipes" }],
  ["qk-tags-input--invalid", ["[&_.qk-tags-input\\_\\_control]:border-qk-danger-border", `[&_.qk-tags-input\\_\\_control]:${invalidControlFocusWithin}`], { layer: "qk-recipes" }],
  ["qk-tags-input--disabled", "text-qk-text-disabled", { layer: "qk-recipes" }],
  ["qk-tags-input--readonly", "", { layer: "qk-recipes" }],
  ["qk-tags-input__header", "flex min-w-0 items-center justify-between gap-qk-inline", { layer: "qk-recipes" }],
  ["qk-tags-input__label", "min-w-0 font-medium text-qk-text-secondary", { layer: "qk-recipes" }],
  ["qk-tags-input__required", "ms-0.5 text-qk-danger-foreground", { layer: "qk-recipes" }],
  ["qk-tags-input__meta", "shrink-0 text-qk-helper tabular-nums text-qk-text-tertiary", { layer: "qk-recipes" }],
  [
    "qk-tags-input__control",
    ["flex min-w-0 flex-wrap items-center gap-qk-inline-tight rounded-qk-control border border-qk-border-default bg-qk-surface-page px-qk-inline-tight py-[var(--qk-border-width-focus)] outline-none transition-colors focus-within:border-qk-border-focus data-[disabled]:cursor-not-allowed data-[disabled]:border-qk-border-disabled data-[disabled]:bg-qk-surface-disabled", controlFocusWithin, { "--qk-tags-input-item-height": "calc(var(--qk-control-size-height) - 2 * var(--qk-border-width-default) - 2 * var(--qk-border-width-focus))" }],
    { layer: "qk-recipes" }
  ],
  // A flex item must not add an anonymous text line box around the fixed-height chip.
  ["qk-tags-input__item", "flex min-w-0 data-[highlighted]:z-1", { layer: "qk-recipes" }],
  [
    "qk-tags-input__item-preview",
    "inline-flex h-[var(--qk-tags-input-item-height)] max-w-full items-center gap-1 rounded-qk-control bg-qk-surface-selected px-2 text-inherit leading-inherit text-qk-text-primary data-[highlighted]:bg-qk-action-soft data-[highlighted]:text-qk-action-text data-[disabled]:text-qk-text-disabled",
    { layer: "qk-recipes" }
  ],
  ["qk-tags-input__item-text", "max-w-40 truncate", { layer: "qk-recipes" }],
  ["qk-tags-input__item-input", "h-[var(--qk-tags-input-item-height)] min-w-16 max-w-40 rounded-qk-control border border-qk-border-focus bg-qk-surface-page px-1.5 text-inherit outline-none", { layer: "qk-recipes" }],
  ["qk-tags-input__delete", "grid size-4 shrink-0 cursor-pointer place-items-center rounded-full border-0 bg-transparent p-0 text-qk-icon-secondary hover:bg-qk-surface-hover hover:text-qk-icon-primary focus-visible:bg-qk-surface-hover focus-visible:outline-none", { layer: "qk-recipes" }],
  ["qk-tags-input__input", "h-[var(--qk-tags-input-item-height)] min-w-28 flex-1 border-0 bg-transparent px-1 text-inherit text-qk-text-primary outline-none placeholder:text-qk-text-placeholder placeholder:opacity-100 disabled:placeholder:text-qk-text-disabled disabled:cursor-not-allowed disabled:text-qk-text-disabled", { layer: "qk-recipes" }],
  ["qk-tags-input__clear", "grid h-[var(--qk-tags-input-item-height)] aspect-square shrink-0 cursor-pointer place-items-center rounded-qk-control border-0 bg-transparent p-0 text-qk-icon-secondary hover:bg-qk-surface-hover hover:text-qk-icon-primary focus-visible:bg-qk-surface-hover focus-visible:outline-none disabled:cursor-not-allowed disabled:text-qk-icon-disabled", { layer: "qk-recipes" }],
  ["qk-tags-input__message", "m-0 text-qk-helper leading-qk-helper text-qk-text-tertiary", { layer: "qk-recipes" }],
  ["qk-tags-input__message--error", "text-qk-danger-foreground", { layer: "qk-recipes" }]
] satisfies UserShortcuts;
