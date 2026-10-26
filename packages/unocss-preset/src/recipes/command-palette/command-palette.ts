import type { StaticShortcut } from '@unocss/core';
/** Search reuses shared input geometry; results retain stable surface space. */
export const commandPaletteShortcuts: StaticShortcut[] = [
  ['qk-command-palette', ['grid min-w-0 w-full gap-qk-inline font-qk-product text-qk-text-primary', { 'max-width': 'min(100%, calc(var(--qk-space-major) * 12))' }], { layer: 'qk-recipes' }],
  ...(['compact', 'regular'] as const).map((density): StaticShortcut => [`qk-command-palette--density-${density}`, [density === 'compact' ? 'text-qk-compact leading-qk-compact' : 'text-qk-control leading-qk-control', { '--qk-command-target': density === 'compact' ? 'var(--qk-control-default)' : 'var(--qk-control-regular)' }], { layer: 'qk-recipes' }]),
  ['qk-command-palette__root', 'grid min-w-0 gap-qk-inline', { layer: 'qk-recipes' }],
  ['qk-command-palette__control', 'box-border w-full min-w-0', { layer: 'qk-recipes' }],
  ['qk-command-palette__viewport', ['relative min-w-0 overflow-hidden', { height: 'min(45dvh, calc(var(--qk-space-major) * 6))' }], { layer: 'qk-recipes' }],
  ['qk-command-palette__results', 'grid h-full min-h-0 min-w-0 content-start overflow-auto overscroll-auto gap-qk-surface-compact', { layer: 'qk-recipes' }],
  ['qk-command-palette__group', 'grid min-w-0 gap-qk-inline-tight', { layer: 'qk-recipes' }],
  ['qk-command-palette__group-label', 'font-qk-control px-qk-inline py-qk-inline-tight text-qk-helper leading-qk-helper text-qk-text-secondary', { layer: 'qk-recipes' }],
  ['qk-command-palette__item', ['font-qk-control flex box-border min-w-0 items-center gap-qk-inline px-qk-inline py-qk-inline-tight rounded-qk-control cursor-pointer outline-none [&[data-highlighted]]:bg-qk-surface-hover [&[data-disabled]]:text-qk-text-disabled [&[data-disabled]]:cursor-default', {'min-height':'var(--qk-command-target)', 'overflow-wrap':'anywhere'}], { layer: 'qk-recipes' }],
  ['qk-command-palette__copy', 'grid min-w-0 flex-1 gap-qk-inline-tight', { layer: 'qk-recipes' }],
  ['qk-command-palette__description', 'font-qk-helper text-qk-helper leading-qk-helper text-qk-text-secondary', { layer: 'qk-recipes' }],
  ['qk-command-palette__adornment', 'inline-flex shrink-0 items-center', { layer: 'qk-recipes' }],
  ['qk-command-palette__trailing', 'min-w-0 max-w-full shrink-0', { layer: 'qk-recipes' }],
  ['qk-command-palette__state', 'flex h-full box-border flex-col items-center justify-center gap-qk-surface-compact p-qk-surface text-qk-text-secondary text-center', { layer: 'qk-recipes' }],
  ['qk-command-palette__error', 'm-0 text-qk-text-primary', { layer: 'qk-recipes' }],
  ['qk-command-palette__status', 'm-0 text-qk-helper leading-qk-helper text-qk-text-secondary', { layer: 'qk-recipes' }],
  ['qk-command-palette__footer', 'min-w-0 pt-qk-inline', { layer: 'qk-recipes' }]
];
/** Recipe class names consumed by static CSS and the token atlas. */
export const commandPaletteRecipeCatalog = Object.freeze(commandPaletteShortcuts.map(shortcut => shortcut[0]));
