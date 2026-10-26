import type { UserShortcuts } from "@unocss/core";

/** UnoCSS preset 发布的 Drawer anatomy 类。 */
export const drawerRecipeCatalog = Object.freeze([
  "qk-drawer__trigger", "qk-drawer__backdrop", "qk-drawer__positioner", "qk-drawer__positioner--start", "qk-drawer__positioner--end", "qk-drawer__positioner--bottom",
  "qk-drawer__content", "qk-drawer__content--start", "qk-drawer__content--end", "qk-drawer__content--bottom", "qk-drawer__content--small", "qk-drawer__content--medium", "qk-drawer__content--large",
  "qk-drawer__header", "qk-drawer__header--bottom", "qk-drawer__heading", "qk-drawer__title", "qk-drawer__description", "qk-drawer__header-actions", "qk-drawer__close-trigger", "qk-drawer__close-trigger--touch", "qk-drawer__body", "qk-drawer__body--bottom", "qk-drawer__footer", "qk-drawer__footer--bottom", "qk-drawer__grabber", "qk-drawer__grabber-indicator"
]);

/** Drawer 已批准 anatomy、方向、尺寸与状态的 UnoCSS shortcuts。 */
export const drawerShortcuts = [
  ["qk-drawer__trigger", "cursor-pointer", { layer: "qk-recipes" }],
  ["qk-drawer__backdrop", "fixed inset-0 z-qk-modal bg-qk-surface-scrim", { layer: "qk-recipes" }],
  ["qk-drawer__positioner", "fixed inset-0 z-qk-modal flex overflow-clip", { layer: "qk-recipes" }],
  ["qk-drawer__positioner--start", "justify-start", { layer: "qk-recipes" }],
  ["qk-drawer__positioner--end", "justify-end", { layer: "qk-recipes" }],
  ["qk-drawer__positioner--bottom", "items-end justify-center", { layer: "qk-recipes" }],
  ["qk-drawer__content", ["box-border grid min-w-0 grid-rows-[auto_minmax(0,1fr)_auto] overflow-hidden bg-qk-surface-overlay text-qk-text-primary shadow-qk-modal [outline:none]", {
    width: "var(--qk-drawer-responsive-width,var(--qk-drawer-width))", height: "var(--qk-drawer-height,100dvh)", "max-width": "var(--qk-drawer-max-width,calc(100vw - 24px))",
    "transition-property": "transform", "transition-duration": "var(--qk-motion-overlay-duration)", "transition-timing-function": "var(--qk-motion-enter-easing)"
  }], { layer: "qk-recipes" }],
  ["qk-drawer__content--start", "border-0 border-r border-qk-border-subtle", { layer: "qk-recipes" }],
  ["qk-drawer__content--end", "border-0 border-l border-qk-border-subtle", { layer: "qk-recipes" }],
  ["qk-drawer__content--bottom", [{ "--qk-drawer-height": "auto", "--qk-drawer-max-width": "100%", "max-height": "calc(100dvh - max(var(--qk-space-group),env(safe-area-inset-top,0px)))", "border-radius": "var(--qk-radius-dialog) var(--qk-radius-dialog) 0 0" }], { layer: "qk-recipes" }],
  ["qk-drawer__content--small", [{ "--qk-drawer-width": "320px" }], { layer: "qk-recipes" }],
  ["qk-drawer__content--medium", [{ "--qk-drawer-width": "420px" }], { layer: "qk-recipes" }],
  ["qk-drawer__content--large", [{ "--qk-drawer-width": "560px" }], { layer: "qk-recipes" }],
  ["qk-drawer__header", "flex min-w-0 items-start justify-between gap-4 border-0 border-b border-qk-border-subtle p-4", { layer: "qk-recipes" }],
  ["qk-drawer__header--bottom", [{ position: "relative", "padding-inline-start": "max(var(--qk-space-surface),env(safe-area-inset-left,0px))", "padding-inline-end": "max(var(--qk-space-surface),env(safe-area-inset-right,0px))" }], { layer: "qk-recipes" }],
  ["qk-drawer__heading", "grid min-w-0 gap-1", { layer: "qk-recipes" }],
  ["qk-drawer__title", "m-0 text-qk-heading leading-qk-heading font-semibold", { layer: "qk-recipes" }],
  ["qk-drawer__description", "m-0 text-qk-compact leading-qk-compact text-qk-text-secondary", { layer: "qk-recipes" }],
  ["qk-drawer__header-actions", "inline-flex shrink-0 items-center gap-1", { layer: "qk-recipes" }],
  ["qk-drawer__close-trigger", ["grid cursor-pointer place-items-center rounded-qk-control border-0 bg-transparent text-qk-icon-secondary [outline:none] hover:text-qk-icon-primary active:text-qk-icon-primary [outline:none] focus-visible:text-qk-action-text", { width: "var(--qk-drawer-close-size,32px)", height: "var(--qk-drawer-close-size,32px)", "-webkit-tap-highlight-color": "transparent" }], { layer: "qk-recipes" }],
  ["qk-drawer__close-trigger--touch", [{ "--qk-drawer-close-size": "var(--qk-control-touch-target)" }], { layer: "qk-recipes" }],
  ["qk-drawer__body", "min-h-0 overflow-y-auto p-4 text-qk-body leading-qk-body", { layer: "qk-recipes" }],
  ["qk-drawer__body--bottom", [{ "overscroll-behavior-y": "contain", "padding-inline-start": "max(var(--qk-space-surface),env(safe-area-inset-left,0px))", "padding-inline-end": "max(var(--qk-space-surface),env(safe-area-inset-right,0px))", "padding-bottom": "max(var(--qk-space-surface),env(safe-area-inset-bottom,0px))" }], { layer: "qk-recipes" }],
  ["qk-drawer__footer", "flex flex-wrap items-center justify-end gap-2 border-0 border-t border-qk-border-subtle p-4", { layer: "qk-recipes" }],
  ["qk-drawer__footer--bottom", [{ "padding-inline-start": "max(var(--qk-space-surface),env(safe-area-inset-left,0px))", "padding-inline-end": "max(var(--qk-space-surface),env(safe-area-inset-right,0px))", "padding-bottom": "max(var(--qk-space-surface),env(safe-area-inset-bottom,0px))" }], { layer: "qk-recipes" }],
  ["qk-drawer__grabber", "absolute left-1/2 top-0 grid size-qk-touch-target -translate-x-1/2 cursor-grab place-items-center active:cursor-grabbing", { layer: "qk-recipes" }],
  ["qk-drawer__grabber-indicator", [{ width: "var(--qk-control-regular)", height: "var(--qk-border-width-focus)", "border-radius": "var(--qk-radius-pill)", "background-color": "var(--qk-color-border-default)" }], { layer: "qk-recipes" }]
] satisfies UserShortcuts;

/** Drawer Presence 生命周期、拖拽和 reduced-motion 使用的静态 CSS。 */
export const drawerStaticCss = [
  "@media(max-width:40rem){.qk-drawer__content--bottom{--qk-drawer-responsive-width:100%}}",
  "@keyframes qk-drawer-backdrop-enter{from{opacity:0}to{opacity:1}}",
  "@keyframes qk-drawer-backdrop-exit{from{opacity:1}to{opacity:0}}",
  "@keyframes qk-drawer-left-enter{from{transform:translate3d(-100%,0,0)}to{transform:translate3d(0,0,0)}}",
  "@keyframes qk-drawer-left-exit{from{transform:translate3d(var(--drawer-translate-x,0px),0,0)}to{transform:translate3d(-100%,0,0)}}",
  "@keyframes qk-drawer-right-enter{from{transform:translate3d(100%,0,0)}to{transform:translate3d(0,0,0)}}",
  "@keyframes qk-drawer-right-exit{from{transform:translate3d(var(--drawer-translate-x,0px),0,0)}to{transform:translate3d(100%,0,0)}}",
  "@keyframes qk-drawer-bottom-enter{from{transform:translate3d(0,100%,0)}to{transform:translate3d(0,var(--drawer-snap-point-offset-y,0px),0)}}",
  "@keyframes qk-drawer-bottom-exit{from{transform:translate3d(0,var(--drawer-translate-y,0px),0)}to{transform:translate3d(0,100%,0)}}",
  ".qk-drawer__header--bottom:has(.qk-drawer__grabber){padding-top:var(--qk-control-touch-target)}",
  // Freeze Ark's measured border box at partial stops; its snap offset consumes body space so the footer stays visible.
  ".qk-drawer__content--bottom:not([data-expanded]){height:var(--drawer-height,auto);padding-bottom:var(--drawer-snap-point-offset-y,0px)}",
  ".qk-drawer__backdrop{opacity:calc(1 - var(--drawer-swipe-progress,0))}",
  ".qk-drawer__backdrop[data-state=open]:not([data-swiping]){animation:qk-drawer-backdrop-enter var(--qk-motion-overlay-duration) var(--qk-motion-enter-easing)}",
  ".qk-drawer__backdrop[data-state=closed]{animation:qk-drawer-backdrop-exit var(--qk-motion-overlay-duration) var(--qk-motion-exit-easing)}",
  ".qk-drawer__content[data-swipe-direction=left][data-state=open]:not([data-dragging]){animation:qk-drawer-left-enter var(--qk-motion-overlay-duration) var(--qk-motion-enter-easing)}",
  ".qk-drawer__content[data-swipe-direction=left][data-state=closed]{animation:qk-drawer-left-exit var(--qk-motion-overlay-duration) var(--qk-motion-exit-easing)}",
  ".qk-drawer__content[data-swipe-direction=right][data-state=open]:not([data-dragging]){animation:qk-drawer-right-enter var(--qk-motion-overlay-duration) var(--qk-motion-enter-easing)}",
  ".qk-drawer__content[data-swipe-direction=right][data-state=closed]{animation:qk-drawer-right-exit var(--qk-motion-overlay-duration) var(--qk-motion-exit-easing)}",
  ".qk-drawer__content[data-swipe-direction=down][data-state=open]:not([data-dragging]){animation:qk-drawer-bottom-enter var(--qk-motion-overlay-duration) var(--qk-motion-enter-easing)}",
  ".qk-drawer__content[data-swipe-direction=down][data-state=closed]{animation:qk-drawer-bottom-exit var(--qk-motion-overlay-duration) var(--qk-motion-exit-easing)}",
  "@media (prefers-reduced-motion:reduce){.qk-drawer__backdrop,.qk-drawer__content{animation:none!important;transition-duration:0s!important}}"
].join("");

/** @deprecated 请改用 `drawerRecipeCatalog`。 */
export const sheetRecipeCatalog = drawerRecipeCatalog;

/** @deprecated 请改用 `drawerShortcuts`。 */
export const sheetShortcuts = drawerShortcuts;
