import type { StaticShortcut } from '@unocss/core';

/** HoverCard shares the established Popover surface; only preview bounds differ. */
export const hoverCardShortcuts: StaticShortcut[] = [
  ['qk-hover-card__positioner', 'qk-popover__positioner', { layer: 'qk-recipes' }],
  ['qk-hover-card__positioner--modal', 'qk-popover__positioner--modal', { layer: 'qk-recipes' }],
  ['qk-hover-card__content', ['qk-popover__content qk-popover__content--border-subtle break-words motion-reduce:transition-none', {
    width: 'var(--qk-hover-card-width,20rem)',
    'max-width': 'min(calc(100vw - 16px),var(--available-width,100vw))',
    'max-height': 'min(calc(100dvh - 16px),var(--available-height,100dvh))'
  }], { layer: 'qk-recipes' }],
  ['qk-hover-card__arrow', 'qk-popover__arrow', { layer: 'qk-recipes' }],
  ['qk-hover-card__arrow-tip', 'qk-popover__arrow-tip qk-popover__arrow-tip--border-subtle', { layer: 'qk-recipes' }]
];
/** Public anatomy included in standalone CSS and the token catalog. */
export const hoverCardRecipeCatalog = Object.freeze(hoverCardShortcuts.map(shortcut => shortcut[0]));
