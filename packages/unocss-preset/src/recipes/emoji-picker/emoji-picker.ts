import type { UserShortcuts } from "@unocss/core";

/** Public anatomy for the editor-independent emoji panel. */
export const emojiPickerRecipeCatalog = Object.freeze([
  "qk-emoji-picker", "qk-emoji-picker__search", "qk-emoji-picker__results", "qk-emoji-picker__content", "qk-emoji-picker__section",
  "qk-emoji-picker__heading", "qk-emoji-picker__glyph", "qk-emoji-picker__categories",
]);
/** The panel composes existing input, gallery and toolbar roles without another overlay skin. */
export const emojiPickerShortcuts = [
  ["qk-emoji-picker", "flex flex-col min-w-0 w-[384px] max-w-full text-qk-text-primary", { layer: "qk-recipes" }],
  ["qk-emoji-picker__search", "px-qk-surface pt-qk-surface pb-qk-inline", { layer: "qk-recipes" }],
  ["qk-emoji-picker__results", "h-[288px] min-h-0", { layer: "qk-recipes" }],
  ["qk-emoji-picker__content", "px-qk-surface pb-qk-inline", { layer: "qk-recipes" }],
  ["qk-emoji-picker__section", "pb-qk-group last:pb-0", { layer: "qk-recipes" }],
  ["qk-emoji-picker__heading", "m-0 py-qk-inline text-qk-compact font-semibold", { layer: "qk-recipes" }],
  ["qk-emoji-picker__glyph", ["text-[24px] leading-none", { "font-family": '"Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", sans-serif' }], { layer: "qk-recipes" }],
  ["qk-emoji-picker__categories", "border-t border-qk-border-subtle px-qk-inline py-qk-inline-tight", { layer: "qk-recipes" }],
] satisfies UserShortcuts;
