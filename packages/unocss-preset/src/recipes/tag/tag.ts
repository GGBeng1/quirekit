import type { StaticShortcut, UserShortcuts } from "@unocss/core";
const families = ["neutral", "primary", "info", "success", "warning", "danger"] as const;
/** Static labels keep readable semantic pairs without inheriting button interactions. */
export const tagShortcuts = [
  ["qk-tag", ["inline-flex min-w-0 max-w-full items-center font-qk-product text-qk-compact leading-qk-compact", { gap: "var(--qk-tag-gap)", "padding-inline": "var(--qk-tag-padding-inline)", "padding-block": "calc(var(--qk-tag-padding-block) / 2)", "border-radius": "var(--qk-tag-radius)", border: "var(--qk-tag-border-width) solid transparent", "overflow-wrap": "anywhere", "vertical-align": "middle" }], { layer: "qk-recipes" }],
  ...families.map(family => [ `qk-tag--${family}`, [{
    "--qk-tag-text": `var(--qk-tag-${family}-text)`, "--qk-tag-surface": `var(--qk-tag-${family}-surface)`,
    "--qk-tag-border": `var(--qk-tag-${family}-border)`, "--qk-tag-solid": `var(--qk-tag-${family}-solid)`, "--qk-tag-on-solid": `var(--qk-tag-${family}-on-solid)`
  }], { layer: "qk-recipes" }] satisfies StaticShortcut),
  ["qk-tag--soft", [{ color: "var(--qk-tag-text)", "background-color": "var(--qk-tag-surface)" }], { layer: "qk-recipes" }],
  ["qk-tag--subtle", [{ color: "var(--qk-tag-text)", "background-color": "var(--qk-tag-surface)", "border-color": "var(--qk-tag-border)" }], { layer: "qk-recipes" }],
  ["qk-tag__content", "min-w-0", { layer: "qk-recipes" }],
  ["qk-tag__decoration", "inline-flex shrink-0 items-center", { layer: "qk-recipes" }],
  ["qk-tag__close", "shrink-0", { layer: "qk-recipes" }],
  ["qk-tag__close--solid", "enabled:text-inherit", { layer: "qk-recipes" }],
  ["qk-tag__content--truncate", "truncate", { layer: "qk-recipes" }],
  ["qk-tag--closable", [{ "padding-block": "0" }], { layer: "qk-recipes" }],
  ["qk-tag--outline", [{ color: "var(--qk-tag-text)", "border-color": "var(--qk-tag-border)" }], { layer: "qk-recipes" }],
  ["qk-tag--solid", [{ color: "var(--qk-tag-on-solid)", "background-color": "var(--qk-tag-solid)" }], { layer: "qk-recipes" }],
  ["qk-tag--xs", ["text-qk-helper leading-qk-helper", { "padding-block": "0" }], { layer: "qk-recipes" }],
  // Subtract the border so default static tags match the 26px closable tag built around a 24px close target.
  ["qk-tag--sm", "text-qk-compact leading-qk-compact [&:not(.qk-tag--closable)]:[padding-block:calc((var(--qk-tag-padding-block)-var(--qk-tag-border-width))/2)]", { layer: "qk-recipes" }],
  ["qk-tag--md", "text-qk-control leading-qk-control", { layer: "qk-recipes" }]
] satisfies UserShortcuts;
/** Public static label classes. */
export const tagRecipeCatalog = Object.freeze(tagShortcuts.map(shortcut => shortcut[0]));
