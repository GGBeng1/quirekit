import type { StaticShortcut, UserShortcuts } from '@unocss/core';
import { themeVariableReferences as tokens } from '@quirekit/ui';

const tones = { info: 'info', success: 'success', warning: 'warning', error: 'danger', forbidden: 'warning', 'not-found': 'info' } as const;

/** Task-result anatomy and semantic presentation variants. */
export const resultRecipeCatalog = Object.freeze([
  'qk-result', 'qk-result--sm', 'qk-result--md',
  ...Object.keys(tones).map(status => `qk-result--${status}`),
  'qk-result__visual', 'qk-result__icon', 'qk-result__icon--sm', 'qk-result__icon--md',
  'qk-result__illustration', 'qk-result__illustration--sm', 'qk-result__illustration--md', 'qk-result__art',
  'qk-result__copy', 'qk-result__title', 'qk-result__title--sm', 'qk-result__title--md',
  'qk-result__description', 'qk-result__content', 'qk-result__actions',
]);

/** Quiet task results with meaningful whitespace, optional details and wrapping actions. */
export const resultShortcuts = [
  ['qk-result', 'box-border flex w-full max-w-full min-w-0 flex-col items-center text-center font-qk-product text-qk-text-primary [overflow-wrap:anywhere]', { layer: 'qk-recipes' }],
  ['qk-result--sm', 'gap-qk-surface-compact p-qk-surface', { layer: 'qk-recipes' }],
  ['qk-result--md', 'gap-qk-surface p-qk-group', { layer: 'qk-recipes' }],
  ...Object.entries(tones).map(([status, tone]) => [
    `qk-result--${status}`, [{
      '--qk-result-icon-color': tokens.color[tone].solid,
      '--qk-result-accent': ['info', 'forbidden', 'not-found'].includes(status) ? tokens.color.icon.secondary : tokens.color[tone].solid,
      '--qk-result-surface': tokens.color[tone].surface,
    }], { layer: 'qk-recipes' },
  ] satisfies StaticShortcut),
  ['qk-result__visual', 'flex min-w-0 max-w-full items-center justify-center text-[var(--qk-result-icon-color)]', { layer: 'qk-recipes' }],
  ['qk-result__illustration', 'flex max-w-full min-w-0 aspect-[20/13] items-center justify-center text-[var(--qk-result-accent)]', { layer: 'qk-recipes' }],
  ['qk-result__illustration--sm', 'w-24', { layer: 'qk-recipes' }],
  ['qk-result__illustration--md', 'w-36', { layer: 'qk-recipes' }],
  ['qk-result__art', 'block h-auto w-full max-w-full', { layer: 'qk-recipes' }],
  ['qk-result__icon', 'inline-flex shrink-0 items-center justify-center rounded-full bg-[var(--qk-result-surface)]', { layer: 'qk-recipes' }],
  ['qk-result__icon--sm', 'size-10', { layer: 'qk-recipes' }],
  ['qk-result__icon--md', 'size-[var(--qk-space-major)]', { layer: 'qk-recipes' }],
  ['qk-result__copy', 'grid w-full max-w-lg min-w-0 gap-qk-inline', { layer: 'qk-recipes' }],
  ['qk-result__title', ['m-0 min-w-0 text-qk-text-primary', { 'font-weight': tokens.typography.heading.fontWeight }], { layer: 'qk-recipes' }],
  ['qk-result__title--sm', 'text-qk-heading leading-qk-heading', { layer: 'qk-recipes' }],
  ['qk-result__title--md', 'text-qk-section-title leading-qk-section-title', { layer: 'qk-recipes' }],
  ['qk-result__description', 'min-w-0 text-qk-control leading-qk-control text-qk-text-secondary', { layer: 'qk-recipes' }],
  ['qk-result__content', 'w-full max-w-lg min-w-0 text-start text-qk-control leading-qk-control', { layer: 'qk-recipes' }],
  ['qk-result__actions', 'flex max-w-full min-w-0 flex-wrap items-center justify-center gap-qk-inline', { layer: 'qk-recipes' }],
] satisfies UserShortcuts;
