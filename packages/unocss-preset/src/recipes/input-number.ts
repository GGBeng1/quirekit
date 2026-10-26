import { controlFocusWithin, invalidControlFocusWithin } from "./control/focus";
import { controlSizeShortcuts } from "./control/sizes";
import type { UserShortcuts } from "@unocss/core";

/** UnoCSS preset 发布的 InputNumber anatomy 类。 */
export const inputNumberRecipeCatalog = Object.freeze([
  "qk-input-number",
  "qk-input-number--xs",
  "qk-input-number--sm",
  "qk-input-number--md",
  "qk-input-number--lg",
  "qk-input-number--xl",
  "qk-input-number--invalid",
  "qk-input-number__control",
  "qk-input-number__control--invalid",
  "qk-input-number__input",
  "qk-input-number__stepper",
  "qk-input-number__stepper-button"
]);

const resetInteractive = { outline: "0", "box-shadow": "none" } as const;

/** InputNumber 的公开 UnoCSS shortcuts。 */
export const inputNumberShortcuts = [
  ["qk-input-number", "inline-block min-w-0 max-w-full text-qk-text-primary", { layer: "qk-recipes" }],
  [
    "qk-input-number__control",
    [
      "relative flex h-full min-w-0 items-center overflow-hidden border border-solid border-qk-border-default bg-qk-surface-page focus-within:border-qk-border-strong data-[disabled]:cursor-not-allowed data-[disabled]:border-qk-border-disabled data-[disabled]:bg-qk-surface-disabled data-[disabled]:text-qk-text-disabled",
      controlFocusWithin,
      { ...resetInteractive, "border-radius": "var(--qk-radius-control)" }
    ],
    { layer: "qk-recipes" }
  ],
  ...controlSizeShortcuts("qk-input-number"),
  ["qk-input-number__control--invalid", ["!border-qk-danger-border", invalidControlFocusWithin], { layer: "qk-recipes" }],
  [
    "qk-input-number__input",
    [
      "size-full min-w-0 appearance-none border-0 bg-transparent px-qk-inline py-0 tabular-nums text-inherit placeholder:text-qk-text-placeholder placeholder:opacity-100 disabled:placeholder:text-qk-text-disabled disabled:cursor-not-allowed",
      resetInteractive
    ],
    { layer: "qk-recipes" }
  ],
  [
    "qk-input-number__stepper",
    [
      "pointer-events-none absolute inset-y-[2px] end-[2px] grid w-[16px] grid-rows-2 overflow-hidden border border-solid border-qk-border-subtle bg-qk-surface-overlay opacity-0 transition-opacity group-hover:pointer-events-auto group-hover:opacity-100 group-focus-within:pointer-events-auto group-focus-within:opacity-100",
      { "border-radius": "4px", "box-shadow": "none" }
    ],
    { layer: "qk-recipes" }
  ],
  [
    "qk-input-number__stepper-button",
    [
      "grid min-h-0 cursor-pointer place-items-center border-0 bg-transparent p-0 text-qk-text-secondary first:border-0 first:border-b first:border-qk-border-subtle hover:bg-qk-surface-hover hover:text-qk-text-primary disabled:cursor-not-allowed disabled:text-qk-text-disabled",
      resetInteractive
    ],
    { layer: "qk-recipes" }
  ]
] satisfies UserShortcuts;

/** 清除浏览器原生数字步进器，统一使用 Ark trigger。 */
export const inputNumberStaticCss = [
  ".qk-input-number__input::-webkit-inner-spin-button,.qk-input-number__input::-webkit-outer-spin-button{-webkit-appearance:none;margin:0}",
  ".qk-input-number__input[type=number]{-moz-appearance:textfield}"
].join("");
