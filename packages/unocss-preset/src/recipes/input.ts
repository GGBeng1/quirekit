import { controlFocusWithin, invalidControlFocusWithin } from "./control/focus";
import { controlSizeShortcuts } from "./control/sizes";
import type { UserShortcuts } from "@unocss/core";

/** UnoCSS preset 发布的 Input anatomy 类。 */
export const inputRecipeCatalog = Object.freeze([
  "qk-input",
  "qk-input--xs",
  "qk-input--sm",
  "qk-input--md",
  "qk-input--lg",
  "qk-input--xl",
  "qk-input--invalid",
  "qk-input--disabled",
  "qk-input__field",
  "qk-input__action",
  "qk-input__adornment"
]);

const resetInteractive = { outline: "0", "box-shadow": "none" } as const;

/** Input 的公开 UnoCSS shortcuts。 */
export const inputShortcuts = [
  [
    "qk-input",
    [
      "inline-flex min-w-0 max-w-full items-center gap-qk-inline border border-solid border-qk-border-default bg-qk-surface-page px-qk-inline text-qk-text-primary focus-within:border-qk-border-strong",
      controlFocusWithin,
      { ...resetInteractive, "border-radius": "var(--qk-radius-control)" }
    ],
    { layer: "qk-recipes" }
  ],
  ...controlSizeShortcuts("qk-input"),
  ["qk-input--invalid", ["!border-qk-danger-border", invalidControlFocusWithin], { layer: "qk-recipes" }],
  ["qk-input--disabled", "cursor-not-allowed border-qk-border-disabled bg-qk-surface-disabled text-qk-text-disabled", { layer: "qk-recipes" }],
  [
    "qk-input__field",
    [
      "h-full min-w-0 flex-1 appearance-none border-0 bg-transparent p-0 text-inherit placeholder:text-qk-text-placeholder placeholder:opacity-100 disabled:placeholder:text-qk-text-disabled disabled:cursor-not-allowed",
      // Native search cancellation would duplicate the public clearable action.
      "[&[type=search]::-webkit-search-cancel-button]:hidden",
      resetInteractive
    ],
    { layer: "qk-recipes" }
  ],
  ["qk-input__adornment", "inline-flex shrink-0 items-center justify-center text-qk-text-secondary [&>.qk-icon]:shrink-0", { layer: "qk-recipes" }],
  ["qk-input__action", "shrink-0 max-h-[calc(100%-2px)]", { layer: "qk-recipes" }]
] satisfies UserShortcuts;

/** Keep native password reveal separate from grouped selectors unsupported by other engines. */
export const inputStaticCss = ".qk-input__field::-ms-reveal{display:none}";
