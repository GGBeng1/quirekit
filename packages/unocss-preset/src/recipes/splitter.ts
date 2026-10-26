import type { UserShortcuts } from "@unocss/core";

/** UnoCSS preset 发布的 Splitter anatomy 类。 */
export const splitterRecipeCatalog = Object.freeze([
  "qk-splitter-frame",
  "qk-splitter",
  "qk-splitter--horizontal",
  "qk-splitter--vertical",
  "qk-splitter__panel",
  "qk-splitter__panel-label",
  "qk-splitter__handle",
  "qk-splitter__handle--sm",
  "qk-splitter__handle--md",
  "qk-splitter__handle--line",
  "qk-splitter__handle--hover-line",
  "qk-splitter__handle--hover-bar",
  "qk-splitter__handle--grip",
  "qk-splitter__handle--custom",
  "qk-splitter__indicator",
  "qk-splitter__indicator-mark"
]);

/** Splitter 已批准 anatomy、方向、尺寸与状态的 UnoCSS shortcuts。 */
export const splitterShortcuts = [
  ["qk-splitter-frame", "min-h-0 min-w-0", { layer: "qk-recipes" }],
  [
    "qk-splitter",
    "flex size-full min-h-0 min-w-0 overflow-hidden rounded-qk-control border border-qk-border-default bg-qk-surface-page text-qk-text-primary",
    { layer: "qk-recipes" }
  ],
  ["qk-splitter--horizontal", "flex-row", { layer: "qk-recipes" }],
  ["qk-splitter--vertical", "flex-col", { layer: "qk-recipes" }],
  [
    "qk-splitter__panel",
    "relative min-h-0 min-w-0 overflow-auto bg-qk-surface-page [outline:none] focus-visible:bg-qk-surface-hover",
    { layer: "qk-recipes" }
  ],
  [
    "qk-splitter__panel-label",
    "grid size-full min-h-20 place-items-center p-qk-surface text-qk-compact leading-qk-compact text-qk-text-secondary",
    { layer: "qk-recipes" }
  ],
  [
    "qk-splitter__handle",
    [
      "relative z-1 flex shrink-0 touch-none select-none items-center justify-center border-0 bg-transparent p-0 [outline:none] data-[disabled]:cursor-not-allowed",
      { appearance: "none" }
    ],
    { layer: "qk-recipes" }
  ],
  [
    "qk-splitter__handle--sm",
    "data-[orientation=horizontal]:w-px data-[orientation=vertical]:h-px",
    { layer: "qk-recipes" }
  ],
  [
    "qk-splitter__handle--md",
    "data-[orientation=horizontal]:w-0.5 data-[orientation=vertical]:h-0.5",
    { layer: "qk-recipes" }
  ],
  [
    "qk-splitter__handle--hover-bar",
    "data-[orientation=horizontal]:min-w-3 data-[orientation=vertical]:min-h-3",
    { layer: "qk-recipes" }
  ],
  [
    "qk-splitter__indicator",
    "pointer-events-none absolute inset-0 grid place-items-center overflow-visible transition-colors motion-reduce:transition-none",
    { layer: "qk-recipes" }
  ],
  [
    "qk-splitter__indicator-mark",
    "block",
    { layer: "qk-recipes" }
  ]
] satisfies UserShortcuts;

/** Splitter 内置调整柄视觉与跨 anatomy 状态使用的静态 CSS。 */
export const splitterStaticCss = [
  // Mirror the registry's fine-pointer margin so resize cursors and hover feedback agree.
  '.qk-splitter__handle:not([data-disabled])::before{position:absolute;content:""}',
  ".qk-splitter__handle[data-orientation=horizontal]::before{inset:0 -5px}",
  ".qk-splitter__handle[data-orientation=vertical]::before{inset:-5px 0}",
  // DOM focus remains after pointer dragging; only keyboard focus retains visual emphasis.
  ".qk-splitter__handle--line .qk-splitter__indicator{background-color:var(--qk-color-border-subtle)}",
  ".qk-splitter__handle--line:not([data-disabled]):hover .qk-splitter__indicator,.qk-splitter__handle--line:not([data-disabled]):focus-visible .qk-splitter__indicator,.qk-splitter__handle--line:not([data-disabled])[data-dragging] .qk-splitter__indicator{background-color:var(--qk-color-action-primary)}",
  ".qk-splitter__handle--line[data-disabled] .qk-splitter__indicator{background-color:var(--qk-color-border-disabled)}",
  ".qk-splitter__handle--hover-line .qk-splitter__indicator{background-color:transparent}",
  ".qk-splitter__handle--hover-line:not([data-disabled]):hover .qk-splitter__indicator,.qk-splitter__handle--hover-line:not([data-disabled]):focus-visible .qk-splitter__indicator,.qk-splitter__handle--hover-line:not([data-disabled])[data-dragging] .qk-splitter__indicator{background-color:var(--qk-color-action-primary)}",
  // The full-length transparent handle owns interaction; only the centered mark fades.
  ".qk-splitter__handle--hover-bar .qk-splitter__indicator-mark{width:4px;height:32px;border-radius:var(--qk-radius-pill);background:var(--qk-color-border-default);opacity:0;transition:opacity var(--qk-motion-feedback-duration),background-color var(--qk-motion-feedback-duration)}",
  ".qk-splitter__handle--hover-bar[data-orientation=vertical] .qk-splitter__indicator-mark{width:32px;height:4px}",
  ".qk-splitter__handle--hover-bar.qk-splitter__handle--md[data-orientation=horizontal] .qk-splitter__indicator-mark{width:6px}",
  ".qk-splitter__handle--hover-bar.qk-splitter__handle--md[data-orientation=vertical] .qk-splitter__indicator-mark{height:6px}",
  ".qk-splitter__handle--hover-bar:not([data-disabled]):hover .qk-splitter__indicator-mark,.qk-splitter__handle--hover-bar:not([data-disabled]):focus-visible .qk-splitter__indicator-mark,.qk-splitter__handle--hover-bar:not([data-disabled])[data-dragging] .qk-splitter__indicator-mark{opacity:1}",
  ".qk-splitter__handle--hover-bar:not([data-disabled]):focus-visible .qk-splitter__indicator-mark,.qk-splitter__handle--hover-bar:not([data-disabled])[data-dragging] .qk-splitter__indicator-mark{background-color:var(--qk-color-action-primary)}",
  "@media (hover:none){.qk-splitter__handle--hover-bar:not([data-disabled]) .qk-splitter__indicator-mark{opacity:1}}",
  "@media (prefers-reduced-motion:reduce){.qk-splitter__handle--hover-bar .qk-splitter__indicator-mark{transition:none}}",
  ".qk-splitter__handle--grip .qk-splitter__indicator,.qk-splitter__handle--custom .qk-splitter__indicator{background-color:transparent}",
  ".qk-splitter__handle--grip .qk-splitter__indicator-mark{position:relative;display:grid;width:8px;height:36px;place-items:center;border:1px solid var(--qk-color-border-default);border-radius:var(--qk-radius-pill);background:var(--qk-color-surface-raised);color:var(--qk-color-icon-secondary);opacity:0;transform:scale(.88);transition:opacity var(--qk-motion-feedback-duration),transform var(--qk-motion-feedback-duration),border-color var(--qk-motion-feedback-duration),color var(--qk-motion-feedback-duration)}",
  ".qk-splitter__handle--grip[data-orientation=vertical] .qk-splitter__indicator-mark{width:36px;height:8px}",
  ".qk-splitter__handle--grip .qk-splitter__indicator-mark::before{width:2px;height:2px;border-radius:var(--qk-radius-pill);background:currentColor;box-shadow:0 -5px 0 currentColor,0 5px 0 currentColor;content:\"\"}",
  ".qk-splitter__handle--grip[data-orientation=vertical] .qk-splitter__indicator-mark::before{box-shadow:-5px 0 0 currentColor,5px 0 0 currentColor}",
  ".qk-splitter__handle--grip:not([data-disabled]):hover .qk-splitter__indicator-mark,.qk-splitter__handle--grip:not([data-disabled]):focus-visible .qk-splitter__indicator .qk-splitter__indicator-mark,.qk-splitter__handle--grip:not([data-disabled])[data-dragging] .qk-splitter__indicator .qk-splitter__indicator-mark{border-color:var(--qk-color-border-focus);color:var(--qk-color-action-primary);opacity:1;transform:scale(1)}",
  ".qk-splitter__handle--grip[data-disabled] .qk-splitter__indicator-mark,.qk-splitter__handle--custom .qk-splitter__indicator-mark{display:none}",
  "@media (prefers-reduced-motion:reduce){.qk-splitter__handle--grip .qk-splitter__indicator-mark{transition:none}}"
].join("");
