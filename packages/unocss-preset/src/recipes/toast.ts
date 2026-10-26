import type { UserShortcuts } from "@unocss/core";

/** UnoCSS preset 发布的 Toast anatomy 类。 */
export const toastRecipeCatalog = Object.freeze([
  "qk-toast__group",
  "qk-toast",
  "qk-toast--info",
  "qk-toast--success",
  "qk-toast--warning",
  "qk-toast--error",
  "qk-toast--loading",
  "qk-toast--appearance-outline",
  "qk-toast--appearance-accent",
  "qk-toast__icon",
  "qk-toast__spinner",
  "qk-toast__body",
  "qk-toast__title",
  "qk-toast__description",
  "qk-toast__action",
  "qk-toast__close-trigger"
]);

/** Toast 视口、内容、状态、动作与关闭按钮的 UnoCSS shortcuts。 */
export const toastShortcuts = [
  [
    "qk-toast__group",
    "z-qk-toast w-[min(360px,calc(100vw-24px))]",
    { layer: "qk-recipes" }
  ],
  [
    "qk-toast",
    [
      "relative grid min-h-14 w-full grid-cols-[auto_minmax(0,1fr)_auto_auto] items-start gap-3 rounded-qk-overlay bg-qk-surface-overlay p-3 text-qk-text-primary shadow-qk-overlay outline-none",
      {
        "border-color": "var(--qk-toast-border-color,var(--qk-color-border-subtle))",
        "border-style": "solid",
        "border-width": "1px"
      }
    ],
    { layer: "qk-recipes" }
  ],
  [
    "qk-toast__icon",
    "mt-0.5 grid h-[var(--qk-toast-icon-size,20px)] w-[var(--qk-toast-icon-size,20px)] shrink-0 place-items-center text-[var(--qk-toast-icon-color,var(--qk-color-info-text))]",
    { layer: "qk-recipes" }
  ],
  ["qk-toast__body", "grid min-w-0 gap-0.5", { layer: "qk-recipes" }],
  ["qk-toast__title", "m-0 min-w-0 text-qk-control font-medium leading-qk-control text-qk-text-primary", { layer: "qk-recipes" }],
  ["qk-toast__description", "m-0 min-w-0 text-qk-compact leading-qk-compact text-qk-text-secondary", { layer: "qk-recipes" }],
  ["qk-toast__action", "self-center", { layer: "qk-recipes" }],
  [
    "qk-toast__close-trigger",
    "grid size-7 shrink-0 cursor-pointer place-items-center self-center rounded-qk-control border-0 bg-transparent p-0 text-qk-icon-secondary outline-none transition-colors hover:bg-qk-surface-hover hover:text-qk-icon-primary focus-visible:bg-qk-surface-hover focus-visible:text-qk-icon-primary",
    { layer: "qk-recipes" }
  ]
] satisfies UserShortcuts;

/** Toast 位置状态机、进入退出与状态图标使用的静态 CSS。 */
export const toastStaticCss = [
  ".qk-toast{height:var(--height,auto);opacity:var(--opacity);translate:var(--x) var(--y);scale:calc(1 - var(--scale,0));z-index:var(--z-index);will-change:translate,scale,opacity,height;transition:translate var(--qk-motion-duration-overlay) var(--qk-motion-easing-enter),scale var(--qk-motion-duration-overlay) var(--qk-motion-easing-enter),opacity var(--qk-motion-duration-feedback) var(--qk-motion-easing-standard),height var(--qk-motion-duration-overlay) var(--qk-motion-easing-standard)}",
  ".qk-toast--info{--qk-toast-status-color:var(--qk-color-info-solid);--qk-toast-icon-color:var(--qk-color-info-text);--qk-toast-icon-surface:var(--qk-color-info-hover-surface)}",
  ".qk-toast--success{--qk-toast-status-color:var(--qk-color-success-solid);--qk-toast-icon-color:var(--qk-color-success-text);--qk-toast-icon-surface:var(--qk-color-success-hover-surface)}",
  ".qk-toast--warning{--qk-toast-status-color:var(--qk-color-warning-solid);--qk-toast-icon-color:var(--qk-color-warning-text);--qk-toast-icon-surface:var(--qk-color-warning-hover-surface)}",
  ".qk-toast--error{--qk-toast-status-color:var(--qk-color-danger-solid);--qk-toast-icon-color:var(--qk-color-danger-text);--qk-toast-icon-surface:var(--qk-color-danger-hover-surface)}",
  ".qk-toast--loading{--qk-toast-status-color:var(--qk-color-action-primary);--qk-toast-icon-color:var(--qk-color-action-text);--qk-toast-icon-surface:var(--qk-color-action-soft)}",
  ".qk-toast--appearance-outline{--qk-toast-border-color:var(--qk-color-border-subtle)}",
  ".qk-toast--appearance-accent{--qk-toast-border-color:color-mix(in srgb,var(--qk-toast-status-color) 24%,var(--qk-color-surface-overlay));--qk-toast-icon-size:28px}",
  // A separate indicator keeps rounded surfaces from bending the status line at their corners.
  ".qk-toast--appearance-accent::before{content:'';position:absolute;inset-block:var(--qk-space-inline);inset-inline-start:var(--qk-space-inline-tight);inline-size:3px;border-radius:var(--qk-radius-pill);background-color:var(--qk-toast-status-color);pointer-events:none}",
  ".qk-toast--appearance-accent .qk-toast__icon{border-radius:var(--qk-radius-control);background-color:var(--qk-toast-icon-surface)}",
  ".qk-toast__spinner>.qk-icon__svg{transform-box:view-box;transform-origin:center;animation:qk-toast-spin .8s linear infinite}",
  "@keyframes qk-toast-spin{from{transform:rotate(0deg) scale(var(--qk-icon-optical-scale,1))}to{transform:rotate(360deg) scale(var(--qk-icon-optical-scale,1))}}",
  "@media (prefers-reduced-motion:reduce){.qk-toast{transition:none}.qk-toast__spinner>.qk-icon__svg{animation:none}}"
].join("");
