import type { StaticShortcut } from '@unocss/core';

/** Native document links; no positioning or scroll ownership is imposed by the visual recipe. */
export const anchorShortcuts: StaticShortcut[] = [
  ['qk-anchor', 'min-w-0 text-qk-text-secondary font-qk-control text-qk-body', { layer: 'qk-recipes' }],
  ['qk-anchor__title', 'm-0 mb-qk-inline font-medium text-qk-text-primary', { layer: 'qk-recipes' }],
  ['qk-anchor__list', 'm-0 p-0 list-none', { layer: 'qk-recipes' }],
  ['qk-anchor__item', 'm-0 p-0 min-w-0', { layer: 'qk-recipes' }],
  ['qk-anchor__children', 'ps-qk-surface-compact', { layer: 'qk-recipes' }],
  ['qk-anchor__link', ['box-border block min-w-0 no-underline text-inherit py-qk-inline px-qk-surface-compact hover:text-qk-text-primary [outline:none] focus-visible:underline focus-visible:underline-offset-4', {
    'border-inline-start': '1px solid var(--qk-color-border-subtle)',
    'overflow-wrap': 'anywhere'
  }], { layer: 'qk-recipes' }],
  ['qk-anchor__link--current', ['text-qk-text-accent hover:text-qk-text-accent', {
    'border-inline-start-color': 'var(--qk-color-text-accent)'
  }], { layer: 'qk-recipes' }]
];
/** Public selectors included in generated presets and standalone stylesheets. */
export const anchorRecipeCatalog = Object.freeze(anchorShortcuts.map(shortcut => shortcut[0]));
