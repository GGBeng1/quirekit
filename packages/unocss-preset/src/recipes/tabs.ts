import { controlSizeShortcuts } from "./control/sizes";
import type { UserShortcuts } from "@unocss/core";

/** UnoCSS preset 发布的 Tabs anatomy 类。 */
export const tabsRecipeCatalog = Object.freeze([
  "qk-tabs",
  "qk-tabs--horizontal",
  "qk-tabs--vertical",
  "qk-tabs__list",
  "qk-tabs__list--horizontal",
  "qk-tabs__list--vertical",
  "qk-tabs__trigger",
  "qk-tabs__trigger--xs",
  "qk-tabs__trigger--sm",
  "qk-tabs__trigger--md",
  "qk-tabs__trigger--lg",
  "qk-tabs__trigger--xl",
  "qk-tabs__indicator",
  "qk-tabs__panels",
  "qk-tabs__content"
]);

/** Tabs 已批准 anatomy、方向、尺寸与状态的 UnoCSS shortcuts。 */
export const tabsShortcuts = [
  ["qk-tabs", "min-w-0 text-qk-text-primary", { layer: "qk-recipes" }],
  ["qk-tabs--horizontal", "block", { layer: "qk-recipes" }],
  ["qk-tabs--vertical", "grid grid-cols-[max-content_minmax(0,1fr)] items-start gap-5", { layer: "qk-recipes" }],
  ["qk-tabs__list", "relative flex min-w-0", { layer: "qk-recipes" }],
  ["qk-tabs__list--horizontal", "flex-row items-end gap-1 border-0 border-b border-qk-border-default", { layer: "qk-recipes" }],
  ["qk-tabs__list--vertical", "min-w-[132px] flex-col items-stretch gap-1 border-0 border-r border-qk-border-default", { layer: "qk-recipes" }],
  [
    "qk-tabs__trigger",
    [
      "relative z-1 inline-flex min-w-0 shrink-0 whitespace-nowrap cursor-pointer select-none items-center rounded-qk-control border border-transparent bg-transparent px-3 font-medium text-qk-text-secondary transition-colors hover:bg-qk-surface-hover hover:text-qk-text-primary data-[selected]:text-qk-action-text data-[disabled]:cursor-not-allowed data-[disabled]:bg-transparent data-[disabled]:text-qk-text-disabled [outline:none] focus-visible:bg-qk-surface-hover motion-reduce:transition-none",
      { outline: "0" }
    ],
    { layer: "qk-recipes" }
  ],
  ...controlSizeShortcuts("qk-tabs__trigger"),
  [
    "qk-tabs__indicator",
    [
      "pointer-events-none z-2 rounded-full bg-qk-action-primary data-[orientation=horizontal]:bottom-[-1px] data-[orientation=horizontal]:h-0.5 data-[orientation=horizontal]:w-[var(--width)] data-[orientation=vertical]:right-[-1px] data-[orientation=vertical]:h-[var(--height)] data-[orientation=vertical]:w-0.5 motion-reduce:!transition-none",
      {
        "--transition-duration": "150ms",
        "--transition-timing-function": "cubic-bezier(0.2, 0, 0, 1)"
      }
    ],
    { layer: "qk-recipes" }
  ],
  ["qk-tabs__panels", "min-w-0", { layer: "qk-recipes" }],
  ["qk-tabs__content", "min-w-0 p-4 text-qk-body leading-qk-body text-qk-text-secondary data-[orientation=vertical]:pt-2 focus-visible:rounded-qk-control [outline:none] focus-visible:bg-qk-surface-hover", { layer: "qk-recipes" }]
] satisfies UserShortcuts;
