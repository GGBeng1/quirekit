import type { UserShortcuts } from "@unocss/core";

/** UnoCSS preset 发布的 Collapsible anatomy 类。 */
export const collapsibleRecipeCatalog = Object.freeze([
  "qk-collapsible",
  "qk-collapsible--plain",
  "qk-collapsible__trigger",
  "qk-collapsible__trigger--ghost",
  "qk-collapsible__trigger--text",
  "qk-collapsible__trigger--sm",
  "qk-collapsible__trigger--md",
  "qk-collapsible__trigger--plain",
  "qk-collapsible__trigger--inline",
  "qk-collapsible__heading--inline",
  "qk-collapsible__heading",
  "qk-collapsible__description",
  "qk-collapsible__indicator",
  "qk-collapsible__content",
  "qk-collapsible__content--plain",
  "qk-collapsible__content-inner",
  "qk-collapsible__content-inner--plain"
]);

/** Collapsible 已批准 anatomy、尺寸与状态的 UnoCSS shortcuts。 */
export const collapsibleShortcuts = [
  ["qk-collapsible", "min-w-0 rounded-qk-control border border-qk-border-default bg-qk-surface-page", { layer: "qk-recipes" }],
  ["qk-collapsible--plain", "!border-0 !bg-transparent", { layer: "qk-recipes" }],
  [
    "qk-collapsible__trigger",
    [
      "flex w-full cursor-pointer select-none items-center justify-between gap-3 rounded-qk-control border border-transparent bg-transparent px-3 py-qk-inline text-left transition-colors data-[disabled]:cursor-not-allowed data-[disabled]:text-qk-text-disabled [outline:none] motion-reduce:transition-none",
      { outline: "0" }
    ],
    { layer: "qk-recipes" }
  ],
  ["qk-collapsible__trigger--ghost", "text-qk-text-primary [&:not([data-disabled]):hover]:bg-qk-surface-hover data-[focus-visible]:bg-qk-surface-hover", { layer: "qk-recipes" }],
  ["qk-collapsible__trigger--text", "text-qk-text-tertiary [&:not([data-disabled]):hover]:text-qk-text-primary focus-visible:text-qk-text-primary focus-visible:underline data-[focus-visible]:text-qk-text-primary data-[focus-visible]:underline underline-offset-4", { layer: "qk-recipes" }],
  ["qk-collapsible__trigger--sm", "min-h-9 text-qk-compact leading-qk-compact", { layer: "qk-recipes" }],
  ["qk-collapsible__trigger--md", "min-h-11 text-qk-body leading-qk-body", { layer: "qk-recipes" }],
  ["qk-collapsible__trigger--plain", "!px-qk-inline !py-qk-inline-tight !min-h-7", { layer: "qk-recipes" }],
  ["qk-collapsible__trigger--inline", "!justify-start !gap-qk-inline-tight", { layer: "qk-recipes" }],
  ["qk-collapsible__heading--inline", "!flex-initial", { layer: "qk-recipes" }],
  ["qk-collapsible__heading", "grid min-w-0 flex-1 gap-0.5 font-medium", { layer: "qk-recipes" }],
  ["qk-collapsible__description", "font-normal text-qk-helper leading-qk-helper text-qk-text-tertiary", { layer: "qk-recipes" }],
  ["qk-collapsible__indicator", "grid size-5 shrink-0 place-items-center text-qk-icon-secondary transition-transform duration-150 data-[state=open]:rotate-90 motion-reduce:transition-none", { layer: "qk-recipes" }],
  ["qk-collapsible__content", "min-w-0 overflow-hidden border-0 border-t border-qk-border-subtle data-[state=closed]:hidden", { layer: "qk-recipes" }],
  ["qk-collapsible__content--plain", "!border-0", { layer: "qk-recipes" }],
  ["qk-collapsible__content-inner", "min-w-0 p-3 text-qk-compact leading-qk-compact text-qk-text-secondary", { layer: "qk-recipes" }],
  ["qk-collapsible__content-inner--plain", "!p-0 !pt-qk-inline", { layer: "qk-recipes" }]
] satisfies UserShortcuts;
