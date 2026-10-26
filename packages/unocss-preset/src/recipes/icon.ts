import type { UserShortcuts } from "@unocss/core";

/** Public Icon recipe classes emitted by the preset. */
export const iconRecipeCatalog = Object.freeze([
  "qk-icon",
  "qk-icon--12",
  "qk-icon--16",
  "qk-icon--20",
  "qk-icon--24",
  "qk-icon__svg",
  "qk-icon__accent",
  "qk-icon__accent-fill",
  "qk-icon__empty-mark"
]);

/** UnoCSS shortcuts for the approved SVG icon renderer anatomy. */
export const iconShortcuts = [
  [
    "qk-icon",
    [{
      "align-items": "center",
      color: "inherit",
      display: "inline-flex",
      "flex-shrink": "0",
      "justify-content": "center",
      "line-height": "1"
    }],
    { layer: "qk-recipes" }
  ],
  ["qk-icon--12", [{ height: "12px", width: "12px" }], { layer: "qk-recipes" }],
  ["qk-icon--16", [{ height: "16px", width: "16px" }], { layer: "qk-recipes" }],
  ["qk-icon--20", [{ height: "20px", width: "20px" }], { layer: "qk-recipes" }],
  ["qk-icon--24", [{ height: "24px", width: "24px" }], { layer: "qk-recipes" }],
  [
    "qk-icon__svg",
    [{
      display: "block",
      height: "100%",
      "pointer-events": "none",
      transform: "scale(var(--qk-icon-optical-scale, 1))",
      "transform-origin": "center",
      width: "100%"
    }],
    { layer: "qk-recipes" }
  ]
] satisfies UserShortcuts;

/** Static selector rules that cannot be represented by one shortcut class. */
export const iconStaticCss = [
  '[dir="rtl"] .qk-icon[data-mirror-rtl="true"]{transform:scaleX(-1)}',
  '.qk-icon__accent{stroke:var(--qk-icon-accent,currentColor)}',
  '.qk-icon__accent-fill{fill:var(--qk-icon-accent,currentColor)}',
  '.qk-icon__empty-mark{opacity:0;stroke:currentColor}',
  '.qk-icon[data-icon-empty="true"] .qk-icon__accent,.qk-icon[data-icon-empty="true"] .qk-icon__accent-fill{opacity:0}',
  '.qk-icon[data-icon-empty="true"] .qk-icon__empty-mark{opacity:1}'
].join("");
