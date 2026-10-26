import type { UserShortcuts } from "@unocss/core";

/** UnoCSS preset 发布的 ScrollArea anatomy 类。 */
export const scrollAreaRecipeCatalog = Object.freeze([
  "qk-scroll-area",
  "qk-scroll-area__viewport",
  "qk-scroll-area__content",
  "qk-scroll-area__scrollbar",
  "qk-scroll-area__scrollbar--vertical",
  "qk-scroll-area__scrollbar--horizontal",
  "qk-scroll-area__scrollbar--sm",
  "qk-scroll-area__scrollbar--md",
  "qk-scroll-area__thumb",
  "qk-scroll-area__corner"
]);

/** ScrollArea 已批准 anatomy、方向、尺寸与状态的 UnoCSS shortcuts。 */
export const scrollAreaShortcuts = [
  [
    "qk-scroll-area",
    "relative min-h-0 min-w-0 overflow-hidden text-qk-text-primary",
    { layer: "qk-recipes" }
  ],
  [
    "qk-scroll-area__viewport",
    "size-full overscroll-contain [outline:none] focus-visible:bg-qk-surface-hover",
    { layer: "qk-recipes" }
  ],
  [
    "qk-scroll-area__content",
    "min-h-full min-w-full",
    { layer: "qk-recipes" }
  ],
  [
    "qk-scroll-area__scrollbar",
    // Overflow visibility must share the flex recipe's cascade layer to win.
    "z-1 flex touch-none select-none p-px transition-[opacity,background-color] duration-150 hover:bg-qk-surface-hover data-[dragging]:bg-qk-surface-hover motion-reduce:transition-none data-[orientation=vertical]:[&:not([data-overflow-y])]:hidden data-[orientation=horizontal]:[&:not([data-overflow-x])]:hidden",
    { layer: "qk-recipes" }
  ],
  [
    "qk-scroll-area__scrollbar--vertical",
    "flex-col",
    { layer: "qk-recipes" }
  ],
  [
    "qk-scroll-area__scrollbar--horizontal",
    "flex-row",
    { layer: "qk-recipes" }
  ],
  [
    "qk-scroll-area__scrollbar--sm",
    "data-[orientation=vertical]:w-2 data-[orientation=horizontal]:h-2",
    { layer: "qk-recipes" }
  ],
  [
    "qk-scroll-area__scrollbar--md",
    "data-[orientation=vertical]:w-2.5 data-[orientation=horizontal]:h-2.5",
    { layer: "qk-recipes" }
  ],
  [
    "qk-scroll-area__thumb",
    // Inset only the paint; Ark still measures and drags the original full-size thumb.
    "relative box-border shrink-0 rounded-full border border-solid border-transparent bg-clip-padding bg-qk-border-subtle transition-colors hover:bg-qk-border-default data-[dragging]:bg-qk-border-default motion-reduce:transition-none",
    { layer: "qk-recipes" }
  ],
  [
    "qk-scroll-area__corner",
    "bg-qk-surface-subtle",
    { layer: "qk-recipes" }
  ]
] satisfies UserShortcuts;

/** ScrollArea 原生滚动条抑制、自动隐藏和滑块最小尺寸使用的静态 CSS。 */
export const scrollAreaStaticCss = [
  ".qk-scroll-area__viewport{scrollbar-width:none;-ms-overflow-style:none}",
  ".qk-scroll-area__viewport::-webkit-scrollbar{display:none}",
  ".qk-scroll-area--auto .qk-scroll-area__scrollbar{opacity:0;pointer-events:none}",
  ".qk-scroll-area--auto .qk-scroll-area__scrollbar[data-hover],.qk-scroll-area--auto .qk-scroll-area__scrollbar[data-scrolling],.qk-scroll-area--auto .qk-scroll-area__scrollbar[data-dragging]{opacity:1;pointer-events:auto}",
  ".qk-scroll-area__scrollbar[data-orientation=vertical] .qk-scroll-area__thumb{min-height:20px;width:100%}",
  ".qk-scroll-area__scrollbar[data-orientation=horizontal] .qk-scroll-area__thumb{height:100%;min-width:20px}"
].join("");
