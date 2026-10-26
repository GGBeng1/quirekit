import type { StaticShortcut } from '@unocss/core';
/** Process geometry derives from existing controls and semantic spacing. */
export const stepsShortcuts: StaticShortcut[] = [
  ['qk-steps', 'min-w-0 w-full font-qk-product text-qk-control leading-qk-control text-qk-text-primary', { layer: 'qk-recipes' }],
  ['qk-steps--compact', [{ '--qk-step-indicator': 'var(--qk-control-compact)' }], { layer: 'qk-recipes' }],
  ['qk-steps--comfortable', [{ '--qk-step-indicator': 'var(--qk-control-default)' }], { layer: 'qk-recipes' }],
  ['qk-steps__viewport', 'max-w-full overflow-x-auto overscroll-auto', { layer: 'qk-recipes' }],
  ['qk-steps__list', 'm-0 p-0 flex min-w-0 list-none gap-qk-inline [&[data-orientation=vertical]]:flex-col', { layer: 'qk-recipes' }],
  ['qk-steps__item', ['relative flex flex-1 items-start gap-qk-inline min-w-0 [&[data-orientation=vertical]]:flex-col', { 'min-width': 'calc(var(--qk-space-major) * 2)' }], { layer: 'qk-recipes' }],
  ['qk-steps__trigger', ['flex min-w-0 max-w-full items-start gap-qk-inline border-0 bg-transparent p-qk-inline-tight text-start text-inherit rounded-qk-control cursor-pointer disabled:cursor-default [&[data-unavailable]]:text-qk-text-disabled [outline:none] focus-visible:bg-qk-surface-hover', { font: 'inherit' }], { layer: 'qk-recipes' }],
  ['qk-steps__indicator', ['inline-flex shrink-0 items-center justify-center rounded-full bg-qk-surface-hover text-qk-text-secondary [&[data-error]]:bg-qk-danger-surface [&[data-error]]:text-qk-danger-text [&[data-current]:not([data-error])]:bg-qk-action-primary [&[data-current]:not([data-error])]:text-qk-action-foreground [&[data-complete]:not([data-error])]:bg-qk-action-soft [&[data-complete]:not([data-error])]:text-qk-action-text', { width: 'var(--qk-step-indicator)', height: 'var(--qk-step-indicator)' }], { layer: 'qk-recipes' }],
  ['qk-steps__copy', ['grid min-w-0 gap-qk-inline-tight', { 'overflow-wrap': 'anywhere', 'padding-block-start': 'calc((var(--qk-step-indicator) - 1lh) / 2)' }], { layer: 'qk-recipes' }],
  ['qk-steps__title', 'text-inherit', { layer: 'qk-recipes' }],
  ['qk-steps__description', 'text-qk-helper leading-qk-helper text-qk-text-secondary', { layer: 'qk-recipes' }],
  ['qk-steps__trigger--error', 'text-qk-danger-text', { layer: 'qk-recipes' }],
  ['qk-steps__error', 'text-qk-helper leading-qk-helper text-qk-danger-text', { layer: 'qk-recipes' }],
  ['qk-steps__separator', ['block flex-1 shrink-0 bg-qk-border-subtle [&[data-complete]]:bg-qk-action-text', { 'min-width': 'var(--qk-space-surface)', height: 'var(--qk-border-width-default)', 'margin-block-start': 'calc(var(--qk-step-indicator) / 2 + var(--qk-space-inline-tight))' }], { layer: 'qk-recipes' }],
  ['qk-steps__separator--vertical', [{ position: 'absolute', width: 'var(--qk-border-width-default)', 'min-width': '0', height: 'auto', top: 'calc(var(--qk-step-indicator) + var(--qk-space-inline-tight) * 2)', bottom: 'calc(-1 * var(--qk-space-inline))', 'inset-inline-start': 'calc(var(--qk-step-indicator) / 2 + var(--qk-space-inline-tight))', 'margin-block-start': '0' }], { layer: 'qk-recipes' }],
  ['qk-steps__content', 'mt-qk-surface min-w-0', { layer: 'qk-recipes' }],
  ['qk-steps__actions', 'mt-qk-surface min-w-0', { layer: 'qk-recipes' }]
];
/** Static recipe entries consumed by CSS generation and the atlas. */
export const stepsRecipeCatalog = Object.freeze(stepsShortcuts.map(shortcut => shortcut[0]));
