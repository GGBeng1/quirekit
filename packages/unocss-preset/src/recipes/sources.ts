import type { StaticShortcut } from '@unocss/core';

/** Sources remain a quiet reading aid rather than another bordered message card. */
export const sourceShortcuts: StaticShortcut[] = [
  ['qk-sources', 'min-w-0 text-qk-helper leading-qk-helper text-qk-text-secondary', { layer: 'qk-recipes' }],
  ['qk-sources__trigger', 'inline-flex min-w-0 items-center gap-qk-inline-tight', { layer: 'qk-recipes' }],
  ['qk-sources__count', 'tabular-nums text-qk-text-tertiary', { layer: 'qk-recipes' }],
  ['qk-sources__list', 'grid min-w-0 max-w-[36rem] gap-qk-inline', { layer: 'qk-recipes' }],
  ['qk-sources__item', 'min-w-0', { layer: 'qk-recipes' }],
  ['qk-sources__link', 'grid w-full min-w-0 grid-cols-[1rem_minmax(0,1fr)] items-center gap-qk-inline-tight rounded-qk-control border-0 bg-transparent p-0 py-qk-inline-tight text-start text-qk-text-secondary [outline:none] hover:text-qk-text-primary focus-visible:text-qk-text-primary focus-visible:underline underline-offset-4 disabled:cursor-default disabled:text-qk-text-tertiary', { layer: 'qk-recipes' }],
  ['qk-sources__number', 'self-center tabular-nums text-qk-text-tertiary', { layer: 'qk-recipes' }],
  ['qk-sources__text', 'grid min-w-0 gap-0.5', { layer: 'qk-recipes' }],
  ['qk-sources__title', 'flex min-w-0 items-center gap-qk-inline-tight text-qk-compact leading-qk-compact', { layer: 'qk-recipes' }],
  ['qk-sources__title-text', 'min-w-0 truncate', { layer: 'qk-recipes' }],
  ['qk-sources__origin', 'min-w-0 truncate text-qk-helper leading-qk-helper text-qk-text-tertiary', { layer: 'qk-recipes' }],
  ['qk-sources__description', 'm-0 text-qk-helper leading-qk-helper text-qk-text-tertiary [overflow-wrap:anywhere]', { layer: 'qk-recipes' }],
  ['qk-inline-citation', 'relative inline-block align-baseline whitespace-nowrap [top:-0.42em] [font-size:0.75em] leading-none', { layer: 'qk-recipes' }],
  ['qk-inline-citation__trigger', 'inline-flex min-h-4 items-center justify-center cursor-pointer rounded-qk-control border-0 px-0.5 font-medium tabular-nums text-qk-action-text bg-transparent [font-size:1em] leading-none [outline:none] hover:bg-qk-action-soft focus-visible:bg-qk-action-soft', { layer: 'qk-recipes' }],
  ['qk-inline-citation__content', 'grid min-w-0 gap-qk-inline-tight text-qk-compact leading-qk-compact', { layer: 'qk-recipes' }],
  ['qk-inline-citation__origin', 'min-w-0 truncate text-qk-helper leading-qk-helper text-qk-text-tertiary', { layer: 'qk-recipes' }],
  ['qk-inline-citation__title', 'font-qk-control text-qk-text-primary [overflow-wrap:anywhere]', { layer: 'qk-recipes' }],
  ['qk-inline-citation__description', 'm-0 text-qk-text-secondary [overflow-wrap:anywhere]', { layer: 'qk-recipes' }],
  ['qk-inline-citation__quote', 'm-0 text-qk-text-secondary italic [overflow-wrap:anywhere]', { layer: 'qk-recipes' }]
];

/** Public anatomy for the source list and citation preview. */
export const sourceRecipeCatalog = Object.freeze(sourceShortcuts.map(shortcut => shortcut[0]));

/** The shared plain disclosure keeps the source list aligned with surrounding prose. */
export const sourceStaticCss = `
.qk-sources > .qk-collapsible > .qk-collapsible__trigger--plain {
  padding-inline: 0 !important;
  border-inline-width: 0;
}
.qk-sources .qk-collapsible__content-inner--plain { padding-inline: 0 !important; }
.qk-inline-citation__card .qk-button { justify-self: start; }
.qk-inline-citation { line-height: 0; }
`;
