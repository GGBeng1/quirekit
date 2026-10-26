import type { StaticShortcut } from '@unocss/core';

/** Layout-only geometry; nested controls keep their own padding and focus rules. */
export const spaceShortcuts: StaticShortcut[] = [
  ['qk-space', 'box-border inline-flex w-fit min-w-0 max-w-full flex-nowrap', { layer: 'qk-recipes' }],
  ['qk-space--horizontal', 'flex-row', { layer: 'qk-recipes' }],
  ['qk-space--vertical', 'flex-col', { layer: 'qk-recipes' }],
  ['qk-space--block', 'flex w-full', { layer: 'qk-recipes' }],
  ['qk-space--wrap', 'flex-wrap', { layer: 'qk-recipes' }]
];
/** Public selectors included in both generated presets and standalone stylesheets. */
export const spaceRecipeCatalog = Object.freeze(spaceShortcuts.map(shortcut => shortcut[0]));
