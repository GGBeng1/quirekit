import { menuVariableReferences } from "@quirekit/ui";
import type { UserShortcuts } from "@unocss/core";

/** Public Menu recipe classes emitted by the preset. */
export const menuRecipeCatalog = Object.freeze([
  "qk-command-list",
  "qk-command-list__item",
  "qk-command-list__description",
  "qk-menu__context-trigger",
  "qk-menu--context",
  "qk-menu--viewport",
  "qk-menu__positioner",
  "qk-menu__positioner--modal",
  "qk-menu",
  "qk-menu__item",
  "qk-menu__indicator",
  "qk-menu__selection-indicator",
  "qk-menu__label",
  "qk-menu__copy",
  "qk-menu__description",
  "qk-menu__trailing",
  "qk-menu__shortcut",
  "qk-menu__disclosure",
  "qk-menu__group",
  "qk-menu__group-label",
  "qk-menu__group-label--inset",
  "qk-menu__separator",
  "qk-menu__submenu-trigger"
]);

/** UnoCSS shortcuts for the approved Ark UI Menu anatomy. */
export const menuShortcuts = [
  ["qk-command-list", "w-full [&.qk-menu]:border-0 [&.qk-menu]:[box-shadow:none]", { layer: "qk-recipes" }],
  ["qk-command-list__description", "min-w-0 max-w-[60%] truncate text-qk-text-muted text-qk-helper leading-qk-helper data-[disabled]:text-qk-text-disabled", { layer: "qk-recipes" }],
  // External focus has one active row shared by pointer and keyboard; a parked
  // pointer must not paint a second row after keyboard navigation moves on.
  ["qk-command-list__item", "w-full appearance-none border-0 bg-transparent text-start [font:inherit] [&:not([data-virtual-focus]):hover]:bg-qk-menu-highlighted-background focus-visible:bg-qk-menu-highlighted-background data-[separator-before=true]:border-t data-[separator-before=true]:border-solid data-[separator-before=true]:border-qk-border-subtle data-[separator-before=true]:mt-1", { layer: "qk-recipes" }],
  ["qk-menu__context-trigger", "min-w-0 [outline:none] focus-visible:bg-qk-surface-hover", { layer: "qk-recipes" }],
  ["qk-menu--context", "overflow-y-auto motion-reduce:transition-none", { layer: "qk-recipes" }],
  ["qk-menu--viewport", "overflow-y-auto motion-reduce:transition-none", { layer: "qk-recipes" }],
  ["qk-menu__positioner--modal", [{ "--qk-menu-layer": "calc(var(--qk-layer-modal) + 1)" }], { layer: "qk-recipes" }],
  [
    "qk-menu__positioner",
    [
      // Zag only publishes --z-index; the positioner is the stacking element, so it must also apply it.
      { "--z-index": `calc(${menuVariableReferences.layer} + var(--qk-menu-depth, 0)) !important`, "z-index": "var(--z-index)", outline: "0" }
    ],
    { layer: "qk-recipes" }
  ],
  [
    "qk-menu",
    [
      "overflow-hidden rounded-qk-menu-overlay border-qk-menu border-solid border-qk-menu-border bg-qk-menu-surface p-qk-menu-content font-qk-menu font-qk-menu-weight text-qk-menu leading-qk-menu tracking-qk-menu text-qk-menu-foreground shadow-qk-menu data-[state=open]:translate-y-0 data-[state=open]:opacity-100 data-[state=closed]:-translate-y-1 data-[state=closed]:opacity-0 transition-[opacity,transform] data-[state=open]:duration-qk-menu-overlay data-[state=open]:ease-qk-menu-enter data-[state=closed]:duration-qk-menu-feedback data-[state=closed]:ease-qk-menu-exit",
      { "z-index": menuVariableReferences.layer, outline: "0" }
    ],
    { layer: "qk-recipes" }
  ],
  [
    "qk-menu__item",
    [
      "flex h-qk-menu-item data-[described]:h-auto data-[described]:min-h-10 data-[described]:py-qk-inline data-[described]:items-start min-w-0 cursor-pointer select-none items-center gap-qk-menu-item-gap rounded-qk-menu-item px-qk-menu-item text-qk-menu-foreground transition-colors duration-qk-menu-feedback ease-qk-menu-feedback data-[highlighted]:bg-qk-menu-highlighted-background data-[highlighted]:text-qk-menu-highlighted-foreground data-[disabled]:cursor-not-allowed data-[disabled]:text-qk-menu-disabled-foreground [&[data-tone=danger]:not([data-disabled])]:text-qk-menu-danger-foreground data-[tone=danger]:data-[highlighted]:bg-qk-menu-danger-highlighted-background",
      { outline: "0" }
    ],
    { layer: "qk-recipes" }
  ],
  [
    "qk-menu__indicator",
    "inline-flex size-qk-menu-icon shrink-0 items-center justify-center [[data-described]>&]:mt-[calc((1lh-var(--qk-menu-icon-size))/2)] [&>div:not([hidden])]:inline-flex [&>div]:size-full [&>div]:items-center [&>div]:justify-center [&_svg]:size-full",
    { layer: "qk-recipes" }
  ],
  [
    "qk-menu__label",
    "font-qk-menu-weight min-w-0 flex-1 overflow-hidden text-ellipsis whitespace-nowrap",
    { layer: "qk-recipes" }
  ],
  ["qk-menu__copy", "grid min-w-0 flex-1 gap-qk-inline-tight", { layer: "qk-recipes" }],
  ["qk-menu__description", "m-0 whitespace-normal break-words text-qk-helper leading-qk-helper font-qk-helper text-qk-text-tertiary", { layer: "qk-recipes" }],
  ["qk-menu__selection-indicator", "text-qk-action-text data-[disabled=true]:text-qk-menu-disabled-foreground", { layer: "qk-recipes" }],
  [
    "qk-menu__trailing",
    "ml-auto inline-flex shrink-0 items-center font-qk-menu-metadata-weight text-qk-menu-metadata-foreground",
    { layer: "qk-recipes" }
  ],
  [
    "qk-menu__shortcut",
    "ml-auto shrink-0 border-0 bg-transparent p-0 font-qk-menu-metadata font-qk-menu-metadata-weight text-qk-menu-metadata leading-qk-menu-metadata text-qk-menu-metadata-foreground",
    { layer: "qk-recipes" }
  ],
  [
    "qk-menu__disclosure",
    "ml-auto inline-flex size-qk-menu-icon shrink-0 items-center justify-center text-qk-menu-metadata-foreground [&>svg]:size-full",
    { layer: "qk-recipes" }
  ],
  [
    "qk-menu__group",
    "m-0 p-0",
    { layer: "qk-recipes" }
  ],
  [
    "qk-menu__group-label",
    "cursor-default select-none overflow-hidden text-ellipsis whitespace-nowrap px-qk-menu-group-label-inline pt-qk-menu-group-label-block pb-0 font-qk-product font-qk-menu-weight text-qk-menu-metadata leading-qk-menu-metadata text-qk-text-muted [&~.qk-menu\\_\\_item]:ps-[calc(var(--qk-menu-item-padding-inline)+var(--qk-space-inline))]",
    { layer: "qk-recipes" }
  ],
  [
    "qk-menu__group-label--inset",
    [{
      "padding-inline-start": `calc(${menuVariableReferences.geometry.itemPaddingInline} + ${menuVariableReferences.geometry.iconSize} + ${menuVariableReferences.geometry.itemGap})`
    }],
    { layer: "qk-recipes" }
  ],
  [
    "qk-menu__separator",
    "mx-qk-menu-separator-inset my-qk-menu-content h-qk-menu-separator border-0 bg-qk-menu-separator",
    { layer: "qk-recipes" }
  ],
  [
    "qk-menu__submenu-trigger",
    "data-[state=open]:bg-qk-menu-highlighted-background data-[state=open]:text-qk-menu-highlighted-foreground",
    { layer: "qk-recipes" }
  ]
] satisfies UserShortcuts;
