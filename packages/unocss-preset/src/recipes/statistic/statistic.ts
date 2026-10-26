import type { UserShortcuts } from '@unocss/core';

/** Quiet native metrics without duplicate container padding, surfaces or borders. */
export const statisticShortcuts = [
  ['qk-statistic', 'm-0 grid min-w-0 max-w-full content-start font-qk-product text-qk-text-primary [overflow-wrap:anywhere]', { layer: 'qk-recipes' }],
  ['qk-statistic--sm', 'gap-qk-inline-tight', { layer: 'qk-recipes' }],
  ['qk-statistic--md', 'gap-qk-inline', { layer: 'qk-recipes' }],
  ['qk-statistic__title', 'min-w-0 text-qk-control leading-qk-control font-qk-body text-qk-text-secondary', { layer: 'qk-recipes' }],
  ['qk-statistic__body', 'm-0 grid min-w-0 gap-qk-inline', { layer: 'qk-recipes' }],
  ['qk-statistic__content', 'flex min-w-0 flex-wrap items-baseline gap-x-qk-inline tabular-nums font-qk-heading', { layer: 'qk-recipes' }],
  ['qk-statistic__content--sm', 'text-qk-section-title leading-qk-section-title min-h-[calc(var(--qk-type-section-title-font-size)*var(--qk-type-section-title-line-height))]', { layer: 'qk-recipes' }],
  ['qk-statistic__content--md', 'text-qk-page-title leading-qk-page-title min-h-[calc(var(--qk-type-page-title-font-size)*var(--qk-type-page-title-line-height))]', { layer: 'qk-recipes' }],
  ['qk-statistic__value', 'min-w-0 max-w-full', { layer: 'qk-recipes' }],
  ['qk-statistic__empty', 'text-qk-text-tertiary', { layer: 'qk-recipes' }],
  ['qk-statistic__prefix', 'min-w-0 text-qk-control leading-qk-control font-qk-body text-qk-text-secondary', { layer: 'qk-recipes' }],
  ['qk-statistic__suffix', 'min-w-0 text-qk-control leading-qk-control font-qk-body text-qk-text-secondary', { layer: 'qk-recipes' }],
  ['qk-statistic__description', 'min-w-0 text-qk-helper leading-qk-helper font-qk-body text-qk-text-secondary', { layer: 'qk-recipes' }],
] satisfies UserShortcuts;

/** Public statistic anatomy and typography selectors for both CSS delivery modes. */
export const statisticRecipeCatalog = Object.freeze(statisticShortcuts.map(shortcut => shortcut[0]));
