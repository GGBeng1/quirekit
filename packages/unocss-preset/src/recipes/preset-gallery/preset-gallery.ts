import type { UserShortcuts } from "@unocss/core";
import { themeVariableReferences } from "@quirekit/ui";

/** Public anatomy for a responsive visual preset gallery. */
export const presetGalleryRecipeCatalog = Object.freeze([
  "qk-preset-gallery", "qk-preset-gallery__grid", "qk-preset-gallery__item",
  "qk-preset-gallery__preview", "qk-preset-gallery__sample", "qk-preset-gallery__label",
  "qk-preset-gallery__description", "qk-preset-gallery--icons",
  "qk-preset-gallery__item--icon", "qk-preset-gallery__preview--icon",
  "qk-preset-gallery__management", "qk-preset-gallery__heading", "qk-preset-gallery__grid--actions",
  "qk-preset-gallery__card", "qk-preset-gallery__select", "qk-preset-gallery__card-heading", "qk-preset-gallery__check", "qk-preset-gallery__actions"
]);

/** Shared semantic styles layered above Listbox's public anatomy. */
export const presetGalleryShortcuts = [
  ["qk-preset-gallery", ["min-w-0 w-full", { "--qk-listbox-max-height": "none" }], { layer: "qk-recipes" }],
  ["qk-preset-gallery__grid", ["grid auto-rows-min content-start p-0 border-0 bg-transparent", {
    gap: `var(--qk-preset-gallery-gap, ${themeVariableReferences.spacing.inline})`,
    // Listbox consumes this public template; source order cannot feed its measured count back into CSS.
    "--qk-listbox-grid-template": `repeat(var(--qk-preset-gallery-repeat, auto-fit), minmax(min(100%, max(var(--qk-preset-gallery-min-width), calc((100% - (var(--qk-preset-gallery-max-columns) - 1) * var(--qk-preset-gallery-gap, ${themeVariableReferences.spacing.inline})) / var(--qk-preset-gallery-max-columns)))), 1fr))`
  }], { layer: "qk-recipes" }],
  ["qk-preset-gallery__item", ["min-w-0 content-start rounded-qk-control border border-transparent bg-transparent hover:[--qk-preset-gallery-preview-border:var(--qk-color-border-default)] data-[focus-visible]:bg-qk-surface-hover", {
    padding: `var(--qk-preset-gallery-item-padding, ${themeVariableReferences.spacing.inline})`,
    gap: `var(--qk-preset-gallery-item-gap, ${themeVariableReferences.spacing.inline})`,
    "--qk-listbox-item-display": "grid",
    "--qk-listbox-item-hover-background": "var(--qk-preset-gallery-hover-background, transparent)",
    "--qk-listbox-item-selected-background": "var(--qk-preset-gallery-selected-background, transparent)",
    "--qk-listbox-item-focus-color": "transparent"
  }], { layer: "qk-recipes" }],
  ["qk-preset-gallery__preview", ["relative grid min-w-0 aspect-[4/3] place-items-center overflow-hidden rounded-qk-control border border-solid bg-qk-surface-page text-qk-text-primary data-[selected]:border-qk-border-strong data-[selected]:bg-qk-surface-selected", {
    "border-color": "var(--qk-preset-gallery-preview-border, var(--qk-color-border-subtle))",
    outline: "none"
  }], { layer: "qk-recipes" }],
  ["qk-preset-gallery__sample", "text-qk-page-title leading-qk-page-title", { layer: "qk-recipes" }],
  ["qk-preset-gallery__label", "min-w-0 truncate text-qk-compact leading-qk-compact data-[selected]:font-semibold", { layer: "qk-recipes" }],
  ["qk-preset-gallery__description", "min-w-0 break-words text-qk-helper leading-qk-helper text-qk-text-tertiary", { layer: "qk-recipes" }],
  ["qk-preset-gallery__management", "grid min-w-0 gap-qk-inline", { layer: "qk-recipes" }],
  ["qk-preset-gallery__heading", "m-0 text-qk-compact leading-qk-compact font-medium text-qk-text-secondary", { layer: "qk-recipes" }],
  ["qk-preset-gallery__grid--actions", "[grid-template-columns:var(--qk-listbox-grid-template)]", { layer: "qk-recipes" }],
  ["qk-preset-gallery__card", "relative grid min-w-0", { layer: "qk-recipes" }],
  ["qk-preset-gallery__select", "box-border grid min-w-0 w-full content-start gap-qk-inline p-qk-inline rounded-qk-control border border-solid border-qk-border-subtle bg-qk-surface-page text-start text-qk-text-primary cursor-pointer [font-family:inherit] [outline:none] enabled:hover:bg-qk-surface-hover enabled:hover:border-qk-border-default aria-[pressed=true]:border-qk-button-primary-border aria-[pressed=true]:bg-qk-button-primary-soft-background enabled:aria-[pressed=true]:hover:border-qk-button-primary-border enabled:aria-[pressed=true]:hover:bg-qk-button-primary-soft-hover-background disabled:cursor-not-allowed disabled:opacity-50", { layer: "qk-recipes" }],
  ["qk-preset-gallery__card-heading", "flex min-w-0 min-h-6 items-center gap-qk-inline-tight pe-7", { layer: "qk-recipes" }],
  ["qk-preset-gallery__check", "size-3.5 shrink-0 opacity-0 text-qk-action-primary data-[selected]:opacity-100", { layer: "qk-recipes" }],
  ["qk-preset-gallery__actions", "absolute end-qk-inline top-qk-inline flex items-center gap-qk-inline-tight", { layer: "qk-recipes" }],
  ["qk-preset-gallery--icons", [{
    "--qk-preset-gallery-gap": themeVariableReferences.spacing.inlineTight,
    "--qk-preset-gallery-repeat": "auto-fill",
    "--qk-preset-gallery-item-padding": "0px",
    "--qk-preset-gallery-item-gap": "0px",
    "--qk-preset-gallery-hover-background": "var(--qk-color-surface-hover)",
    "--qk-preset-gallery-selected-background": "var(--qk-color-surface-selected)"
  }], { layer: "qk-recipes" }],
  ["qk-preset-gallery__item--icon", "aspect-square [&&]:min-h-0 [&&]:p-0 hover:bg-qk-surface-hover data-[selected]:bg-qk-surface-selected", { layer: "qk-recipes" }],
  ["qk-preset-gallery__preview--icon", "aspect-square border-0 bg-transparent text-qk-text-secondary data-[selected]:text-qk-text-primary data-[selected]:bg-transparent", { layer: "qk-recipes" }]
] satisfies UserShortcuts;
