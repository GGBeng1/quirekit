import type { UserShortcuts } from "@unocss/core";

/** Direct composition anatomy for action tasks, retaining Menu and Drawer surfaces. */
export const actionMenuRecipeCatalog = Object.freeze([
  "qk-task__target", "qk-task__surface", "qk-task__header", "qk-task__footer", "qk-task__feedback", "qk-action-menu__bottom", "qk-action-menu__surface", "qk-action-menu__header", "qk-action-menu__title",
  "qk-action-menu__description", "qk-action-menu__item", "qk-action-menu__copy", "qk-action-menu__feedback"
]);

/** Multi-line action rows and a single lightweight heading, using existing surface and state tokens. */
export const actionMenuShortcuts = [
  ["qk-task__surface", "min-w-0", { layer: "qk-recipes" }],
  ["qk-task__header", "min-w-0", { layer: "qk-recipes" }],
  ["qk-task__footer", "min-w-0", { layer: "qk-recipes" }],
  ["qk-task__feedback", "min-h-[calc(var(--qk-type-helper-font-size)*var(--qk-type-helper-line-height))]", { layer: "qk-recipes" }],
  ["qk-action-menu__bottom", "[overscroll-behavior:contain]", { layer: "qk-recipes" }],
  ["qk-task__target", "[@media(pointer:coarse)]:min-w-[var(--qk-control-touch-target)] [@media(pointer:coarse)]:min-h-[var(--qk-control-touch-target)] [.qk-choice-picker\\_\\_surface--bottom_&]:min-h-[var(--qk-control-touch-target)] [.qk-choice-picker\\_\\_surface--bottom_&]:min-w-[var(--qk-control-touch-target)] [.qk-action-menu\\_\\_bottom_&]:min-h-[var(--qk-control-touch-target)] [.qk-action-menu\\_\\_bottom_&]:min-w-[var(--qk-control-touch-target)]", { layer: "qk-recipes" }],
  ["qk-action-menu__surface", "[&.qk-menu]:w-[min(22rem,calc(100vw-1rem))] [&.qk-menu]:max-w-[calc(100vw-1rem)]", { layer: "qk-recipes" }],
  ["qk-action-menu__header", "grid min-w-0 gap-qk-inline-tight px-qk-surface-compact py-qk-inline", { layer: "qk-recipes" }],
  ["qk-action-menu__title", "m-0 text-qk-compact leading-qk-compact font-qk-heading text-qk-text-primary", { layer: "qk-recipes" }],
  ["qk-action-menu__description", "m-0 whitespace-normal break-words text-qk-helper leading-qk-helper font-qk-helper text-qk-text-tertiary", { layer: "qk-recipes" }],
  ["qk-action-menu__item", "[&.qk-menu\\_\\_item]:h-auto [&.qk-menu\\_\\_item]:min-h-10 [&.qk-menu\\_\\_item]:py-qk-inline [@media(pointer:coarse)]:min-h-[var(--qk-control-touch-target)]", { layer: "qk-recipes" }],
  ["qk-action-menu__copy", "grid min-w-0 gap-qk-inline-tight whitespace-normal break-words", { layer: "qk-recipes" }],
  ["qk-action-menu__feedback", "font-qk-helper m-0 px-qk-surface-compact py-qk-inline text-qk-helper leading-qk-helper text-qk-text-secondary [&[role=alert]]:text-qk-danger-text", { layer: "qk-recipes" }]
] satisfies UserShortcuts;
