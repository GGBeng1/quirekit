import type { UserShortcuts } from '@unocss/core';

/** Small visible knobs keep a separate, always touch-sized hit target. */
export const selectionHandlesShortcuts = [
  ['qk-selection-handles__host', 'contents', { layer: 'qk-recipes' }],
  ['qk-selection-handles', 'absolute inset-0 pointer-events-none select-none overflow-visible', { layer: 'qk-recipes' }],
  ['qk-selection-handles__endpoint', 'absolute w-0 pointer-events-none', { layer: 'qk-recipes' }],
  ['qk-selection-handles__stem', 'absolute top-0 h-full pointer-events-none', { layer: 'qk-recipes' }],
  ['qk-selection-handles__grip', 'absolute flex items-center justify-center m-0 p-0 border-0 bg-transparent rounded-full pointer-events-auto touch-none select-none cursor-grab disabled:cursor-default', { layer: 'qk-recipes' }],
  ['qk-selection-handles__knob', 'block rounded-full pointer-events-none', { layer: 'qk-recipes' }]
] satisfies UserShortcuts;

/** Appearance and geometry shared by Vue and direct DOM mounts; all positions are physical. */
export const selectionHandlesStaticCss = `
.qk-selection-gesture { user-select: none; -webkit-user-select: none; -webkit-touch-callout: none; }
.qk-selection-handles {
  color: var(--qk-selection-handles-color, var(--qk-color-action-primary));
  -webkit-touch-callout: none;
}
.qk-selection-handles__endpoint[hidden] { display: none; }
.qk-selection-handles__stem { left: -1px; width: 2px; background: currentColor; }
.qk-selection-handles__grip {
  left: -22px; width: 44px; height: 44px; color: inherit;
  -webkit-touch-callout: none; -webkit-user-select: none;
}
.qk-selection-handles__endpoint[data-side="start"] > .qk-selection-handles__grip { top: -30px; }
.qk-selection-handles__endpoint[data-side="end"] > .qk-selection-handles__grip { top: calc(100% - 14px); }
.qk-selection-handles__knob { width: 16px; height: 16px; background: currentColor; }
.qk-selection-handles__marker { display: none; position: absolute; top: -9px; left: -6px; width: 12px; height: 8px; }
.qk-selection-handles[data-selecting="true"] .qk-selection-handles__marker { display: block; }
.qk-selection-handles__marker::before, .qk-selection-handles__marker::after {
  content: ''; position: absolute; top: 0; width: 4px; height: 8px; box-sizing: border-box;
  border-top: 2px solid currentColor; border-bottom: 2px solid currentColor;
}
.qk-selection-handles__marker::before { left: 0; border-left: 2px solid currentColor; }
.qk-selection-handles__marker::after { right: 0; border-right: 2px solid currentColor; }
.qk-selection-handles__endpoint[data-boundary="start"] > .qk-selection-handles__marker::after,
.qk-selection-handles__endpoint[data-boundary="end"] > .qk-selection-handles__marker::before { display: none; }
.qk-selection-handles[data-selecting="true"] > [data-handle="anchor"] > .qk-selection-handles__grip,
.qk-selection-handles[data-selecting="true"] > [data-handle="anchor"] > .qk-selection-handles__stem { display: none; }
.qk-selection-handles__endpoint[data-dragging] { z-index: 1; }
.qk-selection-handles__endpoint[data-dragging] > .qk-selection-handles__grip { cursor: grabbing; }
.qk-selection-handles[data-dragging] .qk-selection-handles__grip,
.qk-selection-handles[data-selecting="true"] .qk-selection-handles__grip { pointer-events: none; }
.qk-selection-handles__grip:disabled { pointer-events: none; }
@media (forced-colors: active) {
  .qk-selection-handles { color: Highlight; forced-color-adjust: none; }
}
@media print { .qk-selection-handles { display: none; } }
`;

/** Public anatomy discovery for the preset and standalone stylesheet. */
export const selectionHandlesRecipeCatalog = Object.freeze(selectionHandlesShortcuts.map(shortcut => shortcut[0]));
