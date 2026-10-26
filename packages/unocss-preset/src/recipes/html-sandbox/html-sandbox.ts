import type { StaticShortcut } from "@unocss/core";
/** Public sandbox shell using existing semantic surface and typography tokens. */
export const htmlSandboxShortcuts: StaticShortcut[] = [
  ["qk-html-sandbox", "min-w-0 max-w-full overflow-hidden rounded-qk-group border border-qk-border-subtle bg-qk-surface-page text-qk-text-primary", { layer: "qk-recipes" }],
  ["qk-html-sandbox__toolbar", "flex flex-wrap items-center gap-qk-inline p-qk-surface-compact", { layer: "qk-recipes" }],
  ["qk-html-sandbox__title", "font-qk-control text-qk-compact", { layer: "qk-recipes" }],
  ["qk-html-sandbox__status", "flex-1 text-qk-helper text-qk-text-muted", { layer: "qk-recipes" }],
  ["qk-html-sandbox__diagnostics", "p-qk-surface-compact", { layer: "qk-recipes" }],
  ["qk-html-sandbox__logs", "m-0 max-h-60 overflow-auto p-qk-surface text-qk-helper text-qk-text-secondary", { layer: "qk-recipes" }],
];
/** Geometry cannot be controlled by guest CSS. */
export const htmlSandboxStaticCss = `
.qk-html-sandbox { border-style: solid; }
.qk-html-sandbox__viewport { position:relative; min-width:0; isolation:isolate; }
.qk-html-sandbox__mount { width:100%; height:100%; background:white; }
.qk-html-sandbox__placeholder,.qk-html-sandbox__gate { position:absolute; inset:0; display:flex; align-items:center; justify-content:center; padding:var(--qk-space-surface); }
.qk-html-sandbox__placeholder { background:var(--qk-color-surface-page); color:var(--qk-color-text-muted); }
.qk-html-sandbox__gate { background:color-mix(in oklab,var(--qk-color-surface-page) 70%,transparent); }
.qk-html-sandbox__logs pre { white-space:pre-wrap; overflow-wrap:anywhere; margin:0; font-family:var(--qk-type-code-font-family); }
`;
/** Finite recipe names available to scanning and static output. */
export const htmlSandboxRecipeCatalog = Object.freeze(htmlSandboxShortcuts.map(shortcut => shortcut[0]));
