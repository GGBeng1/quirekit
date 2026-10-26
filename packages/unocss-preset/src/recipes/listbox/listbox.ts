import { listDensityShortcuts } from "../control/sizes";
import { createNativeScrollbarCss } from "../shared/native-scrollbar";
import type { UserShortcuts } from "@unocss/core";

/** Listbox 在独立 CSS 产物中保留的公开 anatomy。 */
export const listboxRecipeCatalog = Object.freeze([
  "qk-listbox",
  "qk-listbox__label",
  "qk-listbox__visually-hidden",
  "qk-listbox__content",
  "qk-listbox__content--compact",
  "qk-listbox__content--regular",
  "qk-listbox__content--list",
  "qk-listbox__content--grid",
  "qk-listbox__group",
  "qk-listbox__group-label",
  "qk-listbox__item",
  "qk-listbox__item-copy",
  "qk-listbox__item-label",
  "qk-listbox__item-description",
  "qk-listbox__indicator",
  "qk-listbox__empty"
]);

/** Listbox 复用现有语义 token 的列表、选择与焦点配方。 */
export const listboxShortcuts = [
  ...listDensityShortcuts("qk-listbox__content"),
  ["qk-listbox__visually-hidden", "sr-only", { layer: "qk-recipes" }],
  ["qk-listbox", "grid min-w-0 gap-2 text-qk-compact leading-qk-compact text-qk-text-primary", { layer: "qk-recipes" }],
  ["qk-listbox__label", "font-medium text-qk-compact leading-qk-compact", { layer: "qk-recipes" }],
  ["qk-listbox__content", ["grid auto-rows-max content-start min-h-8 min-w-0 gap-1 overflow-y-auto p-1 [outline:none] data-[highlight-empty]:focus-visible:underline data-[highlight-empty]:focus-visible:underline-offset-4", {
    "max-height": "var(--qk-listbox-max-height,20rem)"
  }], { layer: "qk-recipes" }],
  ["qk-listbox__content--list", "grid-cols-1", { layer: "qk-recipes" }],
  ["qk-listbox__content--grid", [{ "grid-template-columns": "var(--qk-listbox-grid-template,repeat(var(--qk-listbox-columns,1),minmax(0,1fr)))" }], { layer: "qk-recipes" }],
  ["qk-listbox__group", "grid auto-rows-max content-start min-w-0 gap-1", { layer: "qk-recipes" }],
  ["qk-listbox__group-label", "px-2 pb-1 pt-3 text-qk-helper leading-qk-helper font-medium text-qk-text-tertiary", { layer: "qk-recipes" }],
  [
    "qk-listbox__item",
    ["relative min-w-0 cursor-pointer select-none items-center gap-2 rounded-qk-control bg-transparent px-2 [outline:none] transition-colors [&:not([data-disabled]):hover]:bg-[var(--qk-listbox-item-hover-background,var(--qk-color-surface-hover))] data-[selected]:bg-[var(--qk-listbox-item-selected-background,var(--qk-color-surface-selected))] [outline:none] data-[focus-visible]:underline data-[focus-visible]:underline-offset-4 data-[disabled]:cursor-not-allowed data-[disabled]:text-qk-text-disabled motion-reduce:transition-none", {
      display: "var(--qk-listbox-item-display,flex)",
      "min-height": "var(--qk-control-size-height)",
      "padding-block": "max(0px, calc((var(--qk-control-size-height) - var(--qk-control-size-line-height)) / 2))"
    }],
    { layer: "qk-recipes" }
  ],
  ["qk-listbox__item-copy", "grid min-w-0 flex-1 gap-0.5", { layer: "qk-recipes" }],
  ["qk-listbox__item-label", "min-w-0 break-words", { layer: "qk-recipes" }],
  ["qk-listbox__item-description", "min-w-0 break-words text-qk-helper leading-qk-helper text-qk-text-tertiary", { layer: "qk-recipes" }],
  ["qk-listbox__indicator", "grid size-4 shrink-0 place-items-center text-qk-icon-secondary", { layer: "qk-recipes" }],
  ["qk-listbox__empty", "min-w-0 px-3 py-5 text-center text-qk-helper leading-qk-helper text-qk-text-tertiary", { layer: "qk-recipes" }]
] satisfies UserShortcuts;

/** Native Listbox scrolling keeps its viewport and keyboard ownership, with a slim painted thumb. */
export const listboxStaticCss = createNativeScrollbarCss(".qk-listbox__content");
