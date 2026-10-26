import type { UserShortcuts } from "@unocss/core";

/** UnoCSS preset 发布的 TreeView anatomy 类。 */
export const treeViewRecipeCatalog = Object.freeze([
  "qk-tree-view",
  "qk-tree-view--selection-background",
  "qk-tree-view--selection-text",
  "qk-tree-view--hide-guides",
  "qk-tree-view__root-label",
  "qk-tree-view__tree",
  "qk-tree-view__branch",
  "qk-tree-view__branch-control",
  "qk-tree-view__branch-trigger",
  "qk-tree-view__branch-indicator",
  "qk-tree-view__chevron",
  "qk-tree-view__node-text",
  "qk-tree-view__label",
  "qk-tree-view__loading",
  "qk-tree-view__branch-content",
  "qk-tree-view__indent-guide",
  "qk-tree-view__item",
  "qk-tree-view__item-spacer"
]);

/** TreeView 已批准 anatomy、层级、选择与禁用状态的 UnoCSS shortcuts。 */
export const treeViewShortcuts = [
  [
    "qk-tree-view",
    "isolate min-w-0 text-qk-compact leading-qk-compact text-qk-text-primary",
    { layer: "qk-recipes" }
  ],
  ["qk-tree-view__root-label", "sr-only", { layer: "qk-recipes" }],
  [
    "qk-tree-view__tree",
    "m-0 grid min-w-0 list-none gap-px p-1 [outline:none]",
    { layer: "qk-recipes" }
  ],
  ["qk-tree-view__branch", "min-w-0", { layer: "qk-recipes" }],
  [
    "qk-tree-view__branch-control",
    "relative box-border flex min-h-8 min-w-0 cursor-pointer select-none items-center rounded-qk-control border border-transparent pe-2 [outline:none] transition-colors [&:not([data-disabled]):hover]:bg-qk-surface-hover [outline:none] focus-visible:underline focus-visible:underline-offset-4 data-[disabled]:cursor-not-allowed data-[disabled]:bg-transparent data-[disabled]:text-qk-text-disabled motion-reduce:transition-none",
    { layer: "qk-recipes" }
  ],
  [
    "qk-tree-view__branch-trigger",
    "grid h-6 w-4 shrink-0 cursor-pointer place-items-center border-0 bg-transparent p-0 text-qk-icon-secondary [outline:none] data-[disabled]:cursor-not-allowed data-[disabled]:text-qk-text-disabled",
    { layer: "qk-recipes" }
  ],
  [
    "qk-tree-view__branch-indicator",
    "grid size-4 place-items-center transition-transform duration-150 data-[state=open]:rotate-90 motion-reduce:transition-none",
    { layer: "qk-recipes" }
  ],
  [
    "qk-tree-view__chevron",
    "block size-3.5 [:dir(rtl)_&]:-scale-x-100",
    { layer: "qk-recipes" }
  ],
  [
    "qk-tree-view__node-text",
    "flex min-w-0 flex-1 items-center gap-2",
    { layer: "qk-recipes" }
  ],
  ["qk-tree-view__label", "min-w-0 truncate", { layer: "qk-recipes" }],
  [
    "qk-tree-view__loading",
    "size-3.5 shrink-0 rounded-full border-2 border-qk-border-default border-t-qk-action-primary",
    { layer: "qk-recipes" }
  ],
  [
    "qk-tree-view__branch-content",
    "relative min-w-0 data-[state=closed]:hidden",
    { layer: "qk-recipes" }
  ],
  [
    "qk-tree-view__indent-guide",
    "pointer-events-none absolute inset-y-0 z-1 w-px bg-qk-border-subtle",
    { layer: "qk-recipes" }
  ],
  [
    "qk-tree-view__item",
    "relative box-border flex min-h-8 min-w-0 cursor-pointer select-none items-center rounded-qk-control border border-transparent pe-2 [outline:none] transition-colors [&:not([data-disabled]):hover]:bg-qk-surface-hover [outline:none] focus-visible:underline focus-visible:underline-offset-4 data-[disabled]:cursor-not-allowed data-[disabled]:bg-transparent data-[disabled]:text-qk-text-disabled motion-reduce:transition-none",
    { layer: "qk-recipes" }
  ],
  ["qk-tree-view__item-spacer", "h-6 w-4 shrink-0", { layer: "qk-recipes" }]
] satisfies UserShortcuts;

/** TreeView 动态层级缩进与加载指示使用的静态 CSS。 */
export const treeViewStaticCss = [
  // Indent the row box itself so hover, selection and focus share the node's boundary.
  ".qk-tree-view__branch-control,.qk-tree-view__item{margin-inline-start:calc((var(--depth) - 1)*var(--qk-tree-view-indent,16px));padding-inline-start:4px;gap:var(--qk-tree-view-trigger-gap,2px)}",
  // Guide center = row padding (4) + border (1) + half the arrow slot (8); subtract half its 1px stroke.
  ".qk-tree-view__indent-guide{inset-inline-start:calc((var(--depth) - 1)*var(--qk-tree-view-indent,16px) + 12.5px)}",
  ".qk-tree-view--hide-guides .qk-tree-view__indent-guide{display:none}",
  ".qk-tree-view--selection-background [data-part=branch-control][data-selected]:not([data-disabled]),.qk-tree-view--selection-background [data-part=item][data-selected]:not([data-disabled]){background:var(--qk-color-surface-selected)}",
  ".qk-tree-view--selection-text [data-part=branch-control][data-selected]:not([data-disabled]),.qk-tree-view--selection-text [data-part=item][data-selected]:not([data-disabled]){color:var(--qk-color-action-text);font-weight:500}",
  ".qk-tree-view__loading{animation:qk-tree-view-spin .7s linear infinite}",
  "@keyframes qk-tree-view-spin{to{transform:rotate(360deg)}}",
  "@media (prefers-reduced-motion:reduce){.qk-tree-view__loading{animation:none}}"
].join("");
