import { controlFocusWithin, invalidControlFocusWithin } from "./control/focus";
import { controlSizeShortcuts } from "./control/sizes";
import type { UserShortcuts } from "@unocss/core";

/** UnoCSS preset 发布的 Textarea anatomy 类。 */
export const textareaRecipeCatalog = Object.freeze([
  "qk-textarea",
  "qk-textarea--xs",
  "qk-textarea--sm",
  "qk-textarea--md",
  "qk-textarea--lg",
  "qk-textarea--xl",
  "qk-textarea--invalid",
  "qk-textarea--disabled",
  "qk-textarea--embedded",
  "qk-textarea__field",
  "qk-textarea__field--resize-none",
  "qk-textarea__field--resize-vertical",
  "qk-textarea__field--resize-both",
  "qk-textarea__field--counted",
  "qk-textarea__count"
]);

const resetInteractive = { outline: "0", "box-shadow": "none" } as const;

/** Textarea 的公开 UnoCSS shortcuts。 */
export const textareaShortcuts = [
  [
    "qk-textarea",
    [
      "relative inline-grid min-w-0 max-w-full overflow-hidden border border-solid border-qk-border-default bg-qk-surface-page text-qk-text-primary focus-within:border-qk-border-strong",
      controlFocusWithin,
      { ...resetInteractive, "border-radius": "var(--qk-radius-control)" }
    ],
    { layer: "qk-recipes" }
  ],
  ...controlSizeShortcuts("qk-textarea", "content"),
  ["qk-textarea--invalid", ["!border-qk-danger-border", invalidControlFocusWithin], { layer: "qk-recipes" }],
  ["qk-textarea--disabled", "cursor-not-allowed border-qk-border-disabled bg-qk-surface-disabled text-qk-text-disabled", { layer: "qk-recipes" }],
  ["qk-textarea--embedded", ["!border-0 !rounded-none !bg-transparent", { outline: "0 !important", "box-shadow": "none !important" }], { layer: "qk-recipes" }],
  [
    "qk-textarea__field",
    [
      "block min-h-[72px] min-w-0 appearance-none overflow-auto border-0 bg-transparent px-qk-inline py-1.5 text-inherit placeholder:text-qk-text-placeholder placeholder:opacity-100 disabled:placeholder:text-qk-text-disabled disabled:cursor-not-allowed",
      resetInteractive
    ],
    { layer: "qk-recipes" }
  ],
  ["qk-textarea__field--resize-none", "resize-none", { layer: "qk-recipes" }],
  ["qk-textarea__field--resize-vertical", "resize-y", { layer: "qk-recipes" }],
  ["qk-textarea__field--resize-both", "resize", { layer: "qk-recipes" }],
  ["qk-textarea__field--counted", "pb-6", { layer: "qk-recipes" }],
  ["qk-textarea__count", "pointer-events-none absolute bottom-1.5 right-2 text-qk-helper leading-qk-helper text-qk-text-tertiary", { layer: "qk-recipes" }]
] satisfies UserShortcuts;
