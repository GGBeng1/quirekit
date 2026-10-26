import { controlFocusWithin, invalidControlFocusWithin } from "./control/focus";
import { controlSizeShortcuts, listDensityShortcuts } from "./control/sizes";
import type { UserShortcuts } from "@unocss/core";

/** UnoCSS preset 发布的 Combobox anatomy 类。 */
export const comboboxRecipeCatalog = Object.freeze([
  "qk-combobox",
  "qk-combobox__label",
  "qk-combobox__control",
  "qk-combobox__control--xs",
  "qk-combobox__control--sm",
  "qk-combobox__control--md",
  "qk-combobox__control--lg",
  "qk-combobox__control--xl",
  "qk-combobox__search-icon",
  "qk-combobox__input",
  "qk-combobox__clear-slot",
  "qk-combobox__clear-trigger",
  "qk-combobox__trigger",
  "qk-combobox__positioner",
  "qk-combobox__positioner--modal",
  "qk-combobox__content",
  "qk-combobox__content--compact",
  "qk-combobox__content--regular",
  "qk-combobox__content--border-none",
  "qk-combobox__content--border-subtle",
  "qk-combobox__content--border-default",
  "qk-combobox__list",
  "qk-combobox__status",
  "qk-combobox__group",
  "qk-combobox__group-label",
  "qk-combobox__item",
  "qk-combobox__item-text",
  "qk-combobox__item-label",
  "qk-combobox__item-description",
  "qk-combobox__item-indicator"
]);

const resetInteractive = { outline: "0", "box-shadow": "none" } as const;

/** Combobox 的公开 UnoCSS shortcuts。 */
export const comboboxShortcuts = [
  ["qk-combobox", "inline-grid min-w-0 max-w-full", { layer: "qk-recipes" }],
  ["qk-combobox__label", "sr-only", { layer: "qk-recipes" }],
  [
    "qk-combobox__control",
    [
      "flex min-w-0 items-center gap-qk-inline-tight border border-solid border-qk-border-default bg-qk-surface-page px-qk-inline-tight text-qk-text-primary hover:bg-qk-surface-hover data-[focus]:border-qk-border-strong data-[focus]:bg-qk-surface-page data-[invalid]:border-qk-danger-border data-[disabled]:cursor-not-allowed data-[disabled]:border-qk-border-disabled data-[disabled]:bg-qk-surface-disabled data-[disabled]:text-qk-text-disabled",
      controlFocusWithin,
      "[&[data-variant=text]:not([data-invalid]):not([data-disabled]):not([data-focus]):not(:hover)]:border-transparent [&[data-variant=text]:not([data-disabled]):not([data-focus]):not(:hover)]:bg-transparent",
      `data-[invalid]:${invalidControlFocusWithin}`,
      { ...resetInteractive, "border-radius": "var(--qk-radius-control)" }
    ],
    { layer: "qk-recipes" }
  ],
  ...controlSizeShortcuts("qk-combobox__control"),
  ["qk-combobox__clear-slot", "inline-flex size-[20px] shrink-0", { layer: "qk-recipes" }],
  ["qk-combobox__search-icon", "inline-flex size-[16px] shrink-0 items-center justify-center text-qk-icon-secondary", { layer: "qk-recipes" }],
  [
    "qk-combobox__input",
    [
      "h-full min-w-0 flex-1 appearance-none border-0 bg-transparent p-0 text-inherit text-qk-text-primary placeholder:text-qk-text-placeholder placeholder:opacity-100 disabled:placeholder:text-qk-text-disabled disabled:text-qk-text-disabled disabled:cursor-not-allowed",
      resetInteractive
    ],
    { layer: "qk-recipes" }
  ],
  [
    "qk-combobox__clear-trigger",
    [
      "inline-flex size-[20px] shrink-0 cursor-pointer items-center justify-center border-0 bg-transparent p-0 text-qk-icon-secondary hover:bg-qk-surface-pressed hover:text-qk-icon-primary disabled:cursor-not-allowed disabled:text-qk-text-disabled",
      { ...resetInteractive, "border-radius": "var(--qk-radius-control)" }
    ],
    { layer: "qk-recipes" }
  ],
  [
    "qk-combobox__trigger",
    [
      "inline-flex size-[20px] shrink-0 cursor-pointer items-center justify-center border-0 bg-transparent p-0 text-qk-icon-secondary hover:bg-qk-surface-pressed hover:text-qk-icon-primary data-[state=open]:rotate-180 transition-transform disabled:cursor-not-allowed disabled:text-qk-text-disabled",
      { ...resetInteractive, "border-radius": "var(--qk-radius-control)" }
    ],
    { layer: "qk-recipes" }
  ],
  [
    "qk-combobox__positioner",
    [{ "--z-index": "var(--qk-combobox-layer, var(--qk-layer-overlay)) !important", "z-index": "var(--z-index)", outline: "0" }],
    { layer: "qk-recipes" }
  ],
  [
    "qk-combobox__content",
    [
      "overflow-hidden border-solid bg-qk-surface-overlay p-qk-inline-tight text-qk-text-primary data-[state=open]:translate-y-0 data-[state=open]:opacity-100 data-[state=closed]:pointer-events-none data-[state=closed]:-translate-y-1 data-[state=closed]:opacity-0 transition-[opacity,transform]",
      { ...resetInteractive, "border-radius": "var(--qk-radius-overlay)", "z-index": "var(--qk-combobox-layer, var(--qk-layer-overlay))" }
    ],
    { layer: "qk-recipes" }
  ],
  ...listDensityShortcuts("qk-combobox__content"),
  ["qk-combobox__content--border-none", "border-0 shadow-qk-overlay", { layer: "qk-recipes" }],
  ["qk-combobox__positioner--modal", [{ "--qk-combobox-layer": "calc(var(--qk-layer-modal) + 1)" }], { layer: "qk-recipes" }],
  ["qk-combobox__content--border-subtle", "border border-qk-border-subtle shadow-qk-raised", { layer: "qk-recipes" }],
  ["qk-combobox__content--border-default", "border border-qk-border-default shadow-qk-raised", { layer: "qk-recipes" }],
  ["qk-combobox__list", "m-0 grid auto-rows-min content-start max-h-[240px] gap-[2px] overflow-auto p-0", { layer: "qk-recipes" }],
  ["qk-combobox__status", "px-qk-inline py-qk-surface text-qk-text-tertiary", { layer: "qk-recipes" }],
  ["qk-combobox__group", "grid gap-[2px] [&+&]:mt-qk-inline-tight", { layer: "qk-recipes" }],
  ["qk-combobox__group-label", "px-qk-inline pb-[2px] pt-qk-inline-tight text-qk-helper leading-qk-helper font-qk-control text-qk-text-primary", { layer: "qk-recipes" }],
  [
    "qk-combobox__item",
    [
      "flex min-w-0 cursor-pointer select-none items-center gap-qk-inline rounded-qk-control px-qk-inline text-qk-text-primary data-[highlighted]:bg-qk-surface-hover data-[disabled]:cursor-not-allowed data-[disabled]:text-qk-text-disabled",
      {
        ...resetInteractive,
        "min-height": "var(--qk-control-size-height)",
        "padding-block": "max(0px, calc((var(--qk-control-size-height) - var(--qk-control-size-line-height)) / 2))"
      }
    ],
    { layer: "qk-recipes" }
  ],
  ["qk-combobox__item-text", "flex min-w-0 flex-1 items-center gap-qk-inline", { layer: "qk-recipes" }],
  ["qk-combobox__item-label", "overflow-hidden text-ellipsis whitespace-nowrap", { layer: "qk-recipes" }],
  ["qk-combobox__item-description", "overflow-hidden text-ellipsis whitespace-nowrap text-qk-helper leading-qk-helper text-qk-text-tertiary", { layer: "qk-recipes" }],
  ["qk-combobox__item-indicator", "inline-flex size-[16px] shrink-0 items-center justify-center text-qk-action-text", { layer: "qk-recipes" }]
] satisfies UserShortcuts;
