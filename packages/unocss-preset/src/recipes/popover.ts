import { popoverVariableReferences } from "@quirekit/ui";
import type { UserShortcuts } from "@unocss/core";

/** 由 preset 输出的 Popover anatomy 类。 */
export const popoverRecipeCatalog = Object.freeze([
  "qk-popover__positioner",
  "qk-popover__positioner--modal",
  "qk-popover__content",
  "qk-popover__content--border-none",
  "qk-popover__content--border-subtle",
  "qk-popover__content--border-default",
  "qk-popover__title",
  "qk-popover__description",
  "qk-popover__close-trigger",
  "qk-popover__arrow",
  "qk-popover__arrow-tip",
  "qk-popover__arrow-tip--border-none",
  "qk-popover__arrow-tip--border-subtle",
  "qk-popover__arrow-tip--border-default"
]);

/** 使用显式组件 token 的 Popover UnoCSS shortcuts。 */
export const popoverShortcuts = [
  ["qk-popover__positioner--modal", [{ "--qk-popover-layer": "calc(var(--qk-layer-modal) + 1)" }], { layer: "qk-recipes" }],
  [
    "qk-popover__positioner",
    [
      "z-qk-overlay",
      {
        "--z-index": `${popoverVariableReferences.layer} !important`,
        "z-index": popoverVariableReferences.layer
      }
    ],
    { layer: "qk-recipes" }
  ],
  [
    "qk-popover__content",
    [
      "relative grid overflow-auto overscroll-contain border-0 border-solid transition-opacity data-[state=closed]:opacity-0 data-[state=open]:opacity-100",
      {
        "box-sizing": "border-box",
        outline: "0",
        background: popoverVariableReferences.background,
        color: popoverVariableReferences.foreground,
        "border-color": "transparent",
        "border-radius": popoverVariableReferences.radius,
        "box-shadow": popoverVariableReferences.shadow,
        padding: popoverVariableReferences.padding,
        gap: popoverVariableReferences.gap,
        "font-family": popoverVariableReferences.fontFamily,
        "font-size": popoverVariableReferences.body.fontSize,
        "line-height": popoverVariableReferences.body.lineHeight,
        "transition-duration": popoverVariableReferences.motionDuration,
        "transition-timing-function": popoverVariableReferences.enterEasing
      }
    ],
    { layer: "qk-recipes" }
  ],
  [
    "qk-popover__content--border-none",
    [{ "border-width": "0" }],
    { layer: "qk-recipes" }
  ],
  [
    "qk-popover__content--border-subtle",
    [{
      "border-color": "var(--qk-color-border-subtle)",
      "border-width": popoverVariableReferences.borderWidth
    }],
    { layer: "qk-recipes" }
  ],
  [
    "qk-popover__content--border-default",
    [{
      "border-color": popoverVariableReferences.borderColor,
      "border-width": popoverVariableReferences.borderWidth
    }],
    { layer: "qk-recipes" }
  ],
  [
    "qk-popover__title",
    [
      "m-0 min-w-0",
      {
        color: popoverVariableReferences.foreground,
        "font-size": popoverVariableReferences.title.fontSize,
        "line-height": popoverVariableReferences.title.lineHeight,
        "font-weight": popoverVariableReferences.title.fontWeight,
        "letter-spacing": popoverVariableReferences.title.letterSpacing
      }
    ],
    { layer: "qk-recipes" }
  ],
  [
    "qk-popover__description",
    [
      "m-0 min-w-0",
      {
        color: popoverVariableReferences.mutedForeground,
        "font-size": popoverVariableReferences.body.fontSize,
        "line-height": popoverVariableReferences.body.lineHeight
      }
    ],
    { layer: "qk-recipes" }
  ],
  [
    "qk-popover__close-trigger",
    [
      "absolute inline-flex shrink-0 cursor-pointer items-center justify-center border-0 bg-transparent p-0 transition-colors hover:bg-qk-popover-close-hover focus-visible:bg-qk-popover-close-hover disabled:cursor-not-allowed disabled:text-qk-icon-disabled [&>svg]:size-qk-icon",
      {
        width: popoverVariableReferences.closeSize,
        height: popoverVariableReferences.closeSize,
        top: popoverVariableReferences.padding,
        right: popoverVariableReferences.padding,
        outline: "0",
        color: popoverVariableReferences.closeForeground,
        "border-radius": popoverVariableReferences.closeRadius
      }
    ],
    { layer: "qk-recipes" }
  ],
  [
    "qk-popover__arrow",
    [
      "pointer-events-none z-qk-overlay",
      {
        "--arrow-background": popoverVariableReferences.background,
        "--arrow-size": popoverVariableReferences.arrowSize,
        width: popoverVariableReferences.arrowSize,
        height: popoverVariableReferences.arrowSize
      }
    ],
    { layer: "qk-recipes" }
  ],
  [
    "qk-popover__arrow-tip",
    [
      "size-full border-solid",
      {
        background: popoverVariableReferences.background,
        "border-color": "transparent",
        "border-width": "0"
      }
    ],
    { layer: "qk-recipes" }
  ],
  [
    "qk-popover__arrow-tip--border-none",
    [{ "border-width": "0" }],
    { layer: "qk-recipes" }
  ],
  [
    "qk-popover__arrow-tip--border-subtle",
    [{
      "border-color": "var(--qk-color-border-subtle)",
      "border-width": `${popoverVariableReferences.borderWidth} 0 0 ${popoverVariableReferences.borderWidth}`
    }],
    { layer: "qk-recipes" }
  ],
  [
    "qk-popover__arrow-tip--border-default",
    [{
      "border-color": popoverVariableReferences.borderColor,
      "border-width": `${popoverVariableReferences.borderWidth} 0 0 ${popoverVariableReferences.borderWidth}`
    }],
    { layer: "qk-recipes" }
  ]
] satisfies UserShortcuts;

/** Popover 关闭按钮存在时为正文保留的右上角安全区。 */
export const popoverStaticCss = [
  ".qk-popover__content:has(.qk-popover__close-trigger){padding-right:calc(var(--qk-popover-padding) + var(--qk-popover-close-size) + var(--qk-popover-gap))}"
].join("");
