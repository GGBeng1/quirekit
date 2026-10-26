import type { StaticShortcut, UserShortcuts } from "@unocss/core";
/** Keyboard hints are monospace semantic text, with no interactive feedback. */
export const kbdShortcuts = [
  ["qk-kbd", ["inline-flex items-center justify-center whitespace-nowrap align-middle", {
    color: "var(--qk-kbd-foreground)", "background-color": "var(--qk-kbd-background)",
    border: "var(--qk-kbd-border-width) solid var(--qk-kbd-border-color)", "border-radius": "var(--qk-kbd-radius)",
    "box-sizing": "border-box", "font-family": "var(--qk-kbd-font-family)", "font-weight": "var(--qk-kbd-font-weight)",
    "letter-spacing": "var(--qk-kbd-letter-spacing)", "font-size": "var(--qk-kbd-font-size)", "line-height": "1",
    "min-height": "var(--qk-kbd-min-height)", "min-width": "var(--qk-kbd-min-height)",
    "padding-inline": "var(--qk-kbd-padding-inline)", "padding-block": "0"
  }], { layer: "qk-recipes" }],
  ...(["xs", "sm", "md"] as const).map(size => [`qk-kbd--${size}`, [{
    "--qk-kbd-min-height": `var(--qk-kbd-${size}-min-height)`,
    "--qk-kbd-font-size": `var(--qk-kbd-${size}-font-size)`,
    "--qk-kbd-padding-inline": `var(--qk-kbd-${size}-padding-inline)`
  }], { layer: "qk-recipes" }] satisfies StaticShortcut)
] satisfies UserShortcuts;
/** Public key-hint anatomy and size classes. */
export const kbdRecipeCatalog = Object.freeze(kbdShortcuts.map(shortcut => shortcut[0]));
