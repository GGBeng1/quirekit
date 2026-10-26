import { quireKitControlSizes } from "@quirekit/ui";
import { controlSizeShortcuts } from "./control/sizes";
import type { UserShortcuts } from "@unocss/core";

/** UnoCSS preset 发布的 Pagination anatomy 类。 */
export const paginationRecipeCatalog = Object.freeze([
  "qk-pagination",
  "qk-pagination--xs",
  "qk-pagination--sm",
  "qk-pagination--md",
  "qk-pagination--lg",
  "qk-pagination--xl",
  "qk-pagination__summary",
  "qk-pagination__controls",
  "qk-pagination__trigger",
  "qk-pagination__edge-trigger",
  "qk-pagination__item",
  "qk-pagination__ellipsis",
  "qk-pagination__spacer",
  "qk-pagination__jumper",
  "qk-pagination__compact-label"
]);

/** Pagination 已批准布局、页码、禁用和选中状态的 UnoCSS shortcuts。 */
export const paginationShortcuts = [
  ...controlSizeShortcuts("qk-pagination", "content"),
  ["qk-pagination", "flex min-w-0 max-w-full flex-wrap items-center justify-start gap-qk-surface text-qk-text-primary", { layer: "qk-recipes" }],
  ["qk-pagination__summary", "shrink-0 text-qk-helper text-qk-text-secondary", { layer: "qk-recipes" }],
  ["qk-pagination__controls", "flex min-w-0 max-w-full flex-wrap items-center gap-0", { layer: "qk-recipes" }],
  ["qk-pagination__trigger", "grid shrink-0 cursor-pointer place-items-center rounded-qk-control border-0 bg-transparent p-0 text-qk-icon-secondary [outline:none] transition-none enabled:hover:bg-qk-surface-hover enabled:hover:text-qk-icon-primary enabled:active:bg-qk-surface-pressed [outline:none] focus-visible:bg-qk-surface-hover disabled:cursor-not-allowed disabled:text-qk-icon-disabled", { layer: "qk-recipes" }],
  ["qk-pagination__edge-trigger", "font-medium", { layer: "qk-recipes" }],
  ["qk-pagination__item", "grid shrink-0 cursor-pointer place-items-center rounded-qk-control border-0 bg-transparent px-qk-inline-tight py-0 tabular-nums font-medium text-qk-text-secondary [outline:none] transition-none enabled:hover:bg-qk-surface-hover enabled:hover:text-qk-text-primary enabled:active:bg-qk-surface-pressed [outline:none] focus-visible:bg-qk-surface-hover data-[selected]:bg-qk-surface-selected data-[selected]:text-qk-text-primary disabled:cursor-not-allowed disabled:text-qk-text-disabled", { layer: "qk-recipes" }],
  ["qk-pagination__ellipsis", "grid shrink-0 place-items-center text-qk-text-tertiary", { layer: "qk-recipes" }],
  ["qk-pagination__spacer", "min-w-0 flex-1", { layer: "qk-recipes" }],
  ["qk-pagination__jumper", "flex items-center gap-qk-inline text-qk-text-secondary", { layer: "qk-recipes" }],
  ["qk-pagination__compact-label", "grid place-items-center px-qk-inline tabular-nums text-qk-text-secondary", { layer: "qk-recipes" }]
] satisfies UserShortcuts;

/** Pagination 各视觉尺寸使用的静态 CSS。 */
export const paginationStaticCss = Object.entries(quireKitControlSizes).map(([size, role]) =>
  `.qk-pagination--${size} .qk-pagination__trigger,.qk-pagination--${size} .qk-pagination__item,.qk-pagination--${size} .qk-pagination__ellipsis{min-width:var(--qk-control-${role.height});height:var(--qk-control-${role.height})}`
).join("");
