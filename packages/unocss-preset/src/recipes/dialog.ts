import type { UserShortcuts } from "@unocss/core";

/** UnoCSS preset 发布的 Dialog anatomy 类。 */
export const dialogRecipeCatalog = Object.freeze([
  "qk-dialog__trigger",
  "qk-dialog__backdrop",
  "qk-dialog__positioner",
  "qk-dialog__content",
  "qk-dialog__content--small",
  "qk-dialog__content--medium",
  "qk-dialog__content--large",
  "qk-dialog__content--busy",
  "qk-dialog__header",
  "qk-dialog__heading",
  "qk-dialog__title",
  "qk-dialog__description",
  "qk-dialog__header-actions",
  "qk-dialog__action-trigger",
  "qk-dialog__close-trigger",
  "qk-dialog__close-glyph",
  "qk-dialog__body",
  "qk-dialog__status",
  "qk-dialog__footer"
]);

/** Dialog 的公开 UnoCSS shortcuts。 */
export const dialogShortcuts = [
  ["qk-dialog__trigger", "cursor-pointer", { layer: "qk-recipes" }],
  ["qk-dialog__backdrop", "fixed inset-0 z-qk-modal bg-qk-surface-scrim", { layer: "qk-recipes" }],
  ["qk-dialog__positioner", "fixed inset-0 z-qk-modal grid place-items-center overflow-y-auto p-qk-surface", { layer: "qk-recipes" }],
  [
    "qk-dialog__content",
    [
      "grid max-h-[calc(100dvh-32px)] grid-rows-[auto_minmax(0,1fr)_auto_auto] overflow-hidden border-0 bg-qk-surface-overlay text-qk-text-primary shadow-qk-modal [outline:none]",
      { "border-radius": "var(--qk-radius-dialog)" }
    ],
    { layer: "qk-recipes" }
  ],
  ["qk-dialog__content--small", "w-[min(360px,calc(100vw-32px))]", { layer: "qk-recipes" }],
  ["qk-dialog__content--medium", "w-[min(520px,calc(100vw-32px))]", { layer: "qk-recipes" }],
  ["qk-dialog__content--large", "w-[min(720px,calc(100vw-32px))]", { layer: "qk-recipes" }],
  ["qk-dialog__content--busy", "", { layer: "qk-recipes" }],
  ["qk-dialog__header", "flex min-w-0 items-start justify-between gap-qk-surface px-qk-surface pt-qk-surface", { layer: "qk-recipes" }],
  ["qk-dialog__heading", "grid min-w-0 gap-qk-inline-tight", { layer: "qk-recipes" }],
  ["qk-dialog__title", "m-0 text-qk-heading leading-qk-heading font-semibold text-qk-text-primary", { layer: "qk-recipes" }],
  ["qk-dialog__description", "m-0 text-qk-compact leading-qk-compact text-qk-text-secondary", { layer: "qk-recipes" }],
  ["qk-dialog__header-actions", "inline-flex shrink-0 items-center gap-qk-inline-tight", { layer: "qk-recipes" }],
  ["qk-dialog__action-trigger", "cursor-pointer disabled:cursor-not-allowed", { layer: "qk-recipes" }],
  [
    "qk-dialog__close-trigger",
    [
      "inline-flex size-qk-control-default cursor-pointer items-center justify-center border-0 bg-transparent p-0 text-qk-icon-secondary [outline:none] [-webkit-tap-highlight-color:transparent] hover:text-qk-icon-primary active:text-qk-icon-primary [outline:none] focus-visible:text-qk-action-text disabled:cursor-not-allowed disabled:text-qk-icon-disabled",
      { "border-radius": "var(--qk-radius-control)" }
    ],
    { layer: "qk-recipes" }
  ],
  ["qk-dialog__close-glyph", "text-[20px] leading-none", { layer: "qk-recipes" }],
  ["qk-dialog__body", "min-h-0 overflow-y-auto p-qk-surface text-qk-body leading-qk-body text-qk-text-primary", { layer: "qk-recipes" }],
  ["qk-dialog__status", "mx-qk-surface mb-qk-inline text-qk-helper leading-qk-helper text-qk-text-secondary [&[role=alert]]:text-qk-danger-foreground", { layer: "qk-recipes" }],
  ["qk-dialog__footer", "flex flex-wrap items-center justify-end gap-qk-inline px-qk-surface pb-qk-surface", { layer: "qk-recipes" }]
] satisfies UserShortcuts;

/** Dialog Presence 生命周期与 reduced-motion 使用的静态 CSS。 */
export const dialogStaticCss = [
  "@keyframes qk-dialog-backdrop-enter{from{opacity:0}to{opacity:1}}",
  "@keyframes qk-dialog-backdrop-exit{from{opacity:1}to{opacity:0}}",
  "@keyframes qk-dialog-content-enter{from{opacity:0;transform:scale(.98)}to{opacity:1;transform:scale(1)}}",
  "@keyframes qk-dialog-content-exit{from{opacity:1;transform:scale(1)}to{opacity:0;transform:scale(.98)}}",
  ".qk-dialog__backdrop[data-state=open]{animation:qk-dialog-backdrop-enter var(--qk-motion-overlay-duration) var(--qk-motion-enter-easing)}",
  ".qk-dialog__backdrop[data-state=closed]{animation:qk-dialog-backdrop-exit var(--qk-motion-overlay-duration) var(--qk-motion-exit-easing)}",
  ".qk-dialog__content[data-state=open]{animation:qk-dialog-content-enter var(--qk-motion-overlay-duration) var(--qk-motion-enter-easing)}",
  ".qk-dialog__content[data-state=closed]{animation:qk-dialog-content-exit var(--qk-motion-overlay-duration) var(--qk-motion-exit-easing)}",
  "@media (prefers-reduced-motion:reduce){.qk-dialog__backdrop,.qk-dialog__content{animation:none!important}}"
].join("");
