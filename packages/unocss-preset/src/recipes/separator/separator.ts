import type { StaticShortcut } from '@unocss/core';
/** Static boundaries share semantic line width, color and label spacing. */
export const separatorShortcuts: StaticShortcut[] = [
  ['qk-separator', 'box-border flex min-w-0 max-w-full items-center gap-qk-inline font-qk-product text-qk-compact leading-qk-compact text-qk-text-secondary', { layer: 'qk-recipes' }],
  ['qk-separator--horizontal', ['w-full flex-row', { '--qk-separator-line-block': 'var(--qk-border-width-default)', '--qk-separator-line-inline': '0', '--qk-separator-min-inline': 'var(--qk-space-surface-compact)', '--qk-separator-min-block': '0' }], { layer: 'qk-recipes' }],
  ['qk-separator--vertical', ['flex-col shrink-0', { '--qk-separator-line-block': '0', '--qk-separator-line-inline': 'var(--qk-border-width-default)', '--qk-separator-min-inline': '0', '--qk-separator-min-block': 'var(--qk-separator-inline-min-block, var(--qk-space-surface-compact))', 'align-self': 'var(--qk-separator-align, center)' }], { layer: 'qk-recipes' }],
  ['qk-separator--inline', [{ 'block-size': '1em', '--qk-separator-inline-min-block': '0' }], { layer: 'qk-recipes' }],
  ['qk-separator--stretch', [{ '--qk-separator-align': 'stretch' }], { layer: 'qk-recipes' }],
  ['qk-separator--solid', [{ '--qk-separator-line-style': 'solid' }], { layer: 'qk-recipes' }],
  ['qk-separator--dashed', [{ '--qk-separator-line-style': 'dashed' }], { layer: 'qk-recipes' }],
  ['qk-separator--dotted', [{ '--qk-separator-line-style': 'dotted' }], { layer: 'qk-recipes' }],
  ['qk-separator__line', [{ flex: '1 0 0', 'min-inline-size': 'var(--qk-separator-min-inline)', 'min-block-size': 'var(--qk-separator-min-block)', 'border-block-start': 'var(--qk-separator-line-block) var(--qk-separator-line-style) var(--qk-color-border-subtle)', 'border-inline-start': 'var(--qk-separator-line-inline) var(--qk-separator-line-style) var(--qk-color-border-subtle)' }], { layer: 'qk-recipes' }],
  ['qk-separator__label', ['min-w-0 max-w-full text-center', { 'overflow-wrap': 'anywhere', flex: '0 1 auto' }], { layer: 'qk-recipes' }]
];
/** Public anatomy for preset safelists, standalone CSS and the token atlas. */
export const separatorRecipeCatalog = Object.freeze(separatorShortcuts.map(shortcut => shortcut[0]));
