import type { StaticShortcut, UserShortcuts } from "@unocss/core";
const families = ["neutral", "primary", "info", "success", "warning", "danger"] as const;
/** Notification markers reuse semantic pairs and never intercept their host control. */
export const badgeShortcuts = [
  ["qk-badge", "relative inline-flex max-w-full shrink-0 align-middle", { layer: "qk-recipes" }],
  ["qk-badge__indicator", ["inline-flex items-center justify-center whitespace-nowrap font-qk-product tabular-nums", { "box-sizing": "border-box", "min-width": "var(--qk-badge-height)", height: "var(--qk-badge-height)", "font-size": "var(--qk-badge-font-size)", "line-height": "1", "padding-inline": "var(--qk-badge-padding-inline)", "border-radius": "var(--qk-badge-radius)", border: "var(--qk-badge-border-width) solid transparent", "pointer-events": "none" }], { layer: "qk-recipes" }],
  ["qk-badge__indicator--attached", "absolute top-0 end-0 translate-x-1/2 -translate-y-1/2 rtl:-translate-x-1/2", { layer: "qk-recipes" }],
  ["qk-badge__indicator--dot", [{ width: "var(--qk-badge-dot-size)", "min-width": "var(--qk-badge-dot-size)", height: "var(--qk-badge-dot-size)", padding: "0" }], { layer: "qk-recipes" }],
  ...families.map(family => [ `qk-badge--${family}`, [{
    "--qk-badge-text": `var(--qk-badge-${family}-text)`, "--qk-badge-surface": `var(--qk-badge-${family}-surface)`,
    "--qk-badge-border": `var(--qk-badge-${family}-border)`, "--qk-badge-solid": `var(--qk-badge-${family}-solid)`, "--qk-badge-on-solid": `var(--qk-badge-${family}-on-solid)`
  }], { layer: "qk-recipes" }] satisfies StaticShortcut),
  ["qk-badge--soft", [{ color: "var(--qk-badge-text)", "background-color": "var(--qk-badge-surface)" }], { layer: "qk-recipes" }],
  ["qk-badge--outline", [{ color: "var(--qk-badge-text)", "border-color": "var(--qk-badge-border)" }], { layer: "qk-recipes" }],
  ["qk-badge--solid", [{ color: "var(--qk-badge-on-solid)", "background-color": "var(--qk-badge-solid)" }], { layer: "qk-recipes" }],
  ...(["xs", "sm", "md"] as const).map(size => [`qk-badge--${size}`, [{ "--qk-badge-height": `var(--qk-badge-${size}-height)`, "--qk-badge-font-size": `var(--qk-badge-${size}-font-size)` }], { layer: "qk-recipes" }] satisfies StaticShortcut)
] satisfies UserShortcuts;
/** Public notification marker classes. */
export const badgeRecipeCatalog = Object.freeze(badgeShortcuts.map(shortcut => shortcut[0]));
