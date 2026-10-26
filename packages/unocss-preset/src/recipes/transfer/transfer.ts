import type { UserShortcuts } from '@unocss/core';

/** Transfer composition classes retained in the standalone stylesheet. */
export const transferRecipeCatalog = Object.freeze([
  'qk-transfer', 'qk-transfer__label', 'qk-transfer__required', 'qk-transfer__layout', 'qk-transfer__panel',
  'qk-transfer__header', 'qk-transfer__count', 'qk-transfer__search', 'qk-transfer__list',
  'qk-transfer__content', 'qk-transfer__notice', 'qk-transfer__actions', 'qk-transfer__arrow'
]);

/** Reuse public control appearance; this recipe owns only the two-list composition. */
export const transferShortcuts = [
  ['qk-transfer', 'relative grid min-w-0 max-w-full gap-qk-inline text-qk-control leading-qk-control text-qk-text-primary [container-type:inline-size] [container-name:qk-transfer]', { layer: 'qk-recipes' }],
  ['qk-transfer__label', 'font-medium text-qk-text-secondary', { layer: 'qk-recipes' }],
  ['qk-transfer__required', 'ms-0.5 text-qk-danger-foreground', { layer: 'qk-recipes' }],
  ['qk-transfer__layout', 'grid min-w-0 items-start gap-qk-inline', { layer: 'qk-recipes' }],
  ['qk-transfer__panel', 'grid min-w-0 overflow-hidden rounded-qk-control border border-solid border-qk-border-default bg-qk-surface-page [[data-invalid]_&]:border-qk-danger-border', { layer: 'qk-recipes' }],
  ['qk-transfer__header', 'flex min-w-0 items-center justify-between gap-qk-inline border-b border-b-solid border-qk-border-subtle p-qk-inline', { layer: 'qk-recipes' }],
  ['qk-transfer__count', 'shrink-0 text-qk-helper leading-qk-helper tabular-nums text-qk-text-tertiary', { layer: 'qk-recipes' }],
  ['qk-transfer__search', 'px-qk-inline pt-qk-inline', { layer: 'qk-recipes' }],
  ['qk-transfer__list', 'relative min-h-48 content-start gap-0', { layer: 'qk-recipes' }],
  ['qk-transfer__content', 'max-h-48', { layer: 'qk-recipes' }],
  ['qk-transfer__notice', 'm-0 border-t border-t-solid border-qk-border-subtle p-qk-inline text-qk-helper leading-qk-helper text-qk-text-tertiary', { layer: 'qk-recipes' }],
  ['qk-transfer__actions', 'flex flex-wrap items-center justify-center gap-qk-inline self-center', { layer: 'qk-recipes' }],
  ['qk-transfer__arrow', 'inline-flex', { layer: 'qk-recipes' }]
] satisfies UserShortcuts;

/** Adapt to the component's container so narrow panels work inside wide desktop pages. */
export const transferStaticCss = `
.qk-transfer__arrow{transform:rotate(90deg)}
@container qk-transfer (min-width:32rem){
  .qk-transfer__layout{grid-template-columns:minmax(0,1fr) auto minmax(0,1fr)}
  .qk-transfer__actions{flex-direction:column}
  .qk-transfer__arrow{transform:none}
  [dir="rtl"] .qk-transfer__arrow{transform:rotate(180deg)}
}`;
