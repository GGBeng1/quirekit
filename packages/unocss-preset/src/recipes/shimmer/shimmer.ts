import type { StaticShortcut } from '@unocss/core';

/** Text inherits its surrounding typography; only its processing emphasis changes. */
export const shimmerShortcuts: StaticShortcut[] = [
  ['qk-shimmer', 'text-qk-text-secondary', { layer: 'qk-recipes' }]
];

/** Animation has no timer, duplicated text, implicit live region or layout work. */
export const shimmerStaticCss = `
@keyframes qk-shimmer-sweep { from { background-position: 100% 0; } to { background-position: 0% 0; } }
@supports ((background-clip: text) or (-webkit-background-clip: text)) {
  .qk-shimmer[data-active="true"] {
    background-image: linear-gradient(100deg, var(--qk-color-text-muted) 34%, var(--qk-color-text-primary) 44%, var(--qk-color-text-primary) 56%, var(--qk-color-text-muted) 66%);
    background-size: 300% 100%;
    background-repeat: no-repeat;
    background-clip: text;
    -webkit-background-clip: text;
    color: transparent;
    animation: qk-shimmer-sweep var(--qk-shimmer-duration, calc(var(--qk-motion-overlay-duration) * 8)) linear infinite;
  }
  .qk-shimmer[data-active="true"]:dir(rtl) { animation-direction: reverse; }
}
@media (prefers-reduced-motion: reduce), (forced-colors: active), print {
  .qk-shimmer[data-active="true"] { animation: none; background: none; color: var(--qk-color-text-secondary); }
}
@media (forced-colors: active) { .qk-shimmer { color: CanvasText !important; } }
`;

/** Shared discovery for the preset, standalone CSS and design metadata. */
export const shimmerRecipeCatalog = Object.freeze(shimmerShortcuts.map(shortcut => shortcut[0]));
