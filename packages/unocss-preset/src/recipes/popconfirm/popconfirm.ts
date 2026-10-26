import type { StaticShortcut } from '@unocss/core';

/** Anchored confirmation adds bounded width and action layout to the shared Popover surface. */
export const popconfirmShortcuts: StaticShortcut[] = [
  ['qk-popconfirm', [{ width: '20rem', 'max-width': 'min(calc(100vw - 16px),var(--available-width,100vw))', 'overflow-wrap': 'anywhere' }], { layer: 'qk-recipes' }],
  ['qk-popconfirm__actions', 'flex items-center justify-end gap-2', { layer: 'qk-recipes' }],
  ['qk-popconfirm__error', 'm-0 text-qk-danger-foreground', { layer: 'qk-recipes' }]
];
/** Public anatomy included in standalone CSS and token discovery. */
export const popconfirmRecipeCatalog = Object.freeze(popconfirmShortcuts.map(shortcut => shortcut[0]));
