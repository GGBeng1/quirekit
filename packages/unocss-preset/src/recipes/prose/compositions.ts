import type { StaticShortcut } from "@unocss/core";

/** Shared reading compositions keep the existing image, code and tab geometry. */
export const proseCompositionShortcuts: StaticShortcut[] = [
  ["qk-prose-image", "grid grid-cols-1 justify-items-start min-w-0 max-w-full", { layer: "qk-recipes" }],
  ["qk-prose-source", "my-qk-surface min-w-0 max-w-full", { layer: "qk-recipes" }],
  ["qk-prose-source--embedded", [{ "margin-block": "0" }], { layer: "qk-recipes" }],
  ["qk-prose-preview", "w-full min-w-0 border border-solid border-qk-border-subtle rounded-qk-control bg-qk-surface-page", { layer: "qk-recipes" }],
  ["qk-prose-preview__content", "min-w-0", { layer: "qk-recipes" }],
  ["qk-prose-preview__source", "min-w-0", { layer: "qk-recipes" }]
];
