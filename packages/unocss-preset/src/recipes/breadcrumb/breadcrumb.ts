import type { StaticShortcut } from '@unocss/core';
/** Native hierarchy links use shared typography, targets and focus roles. */
export const breadcrumbShortcuts: StaticShortcut[] = [
  ['qk-breadcrumb', 'min-w-0 max-w-full font-qk-product text-qk-control leading-qk-control text-qk-text-secondary', { layer: 'qk-recipes' }],
  ['qk-breadcrumb__list', 'm-0 flex min-w-0 max-w-full list-none flex-wrap items-start gap-qk-inline p-0', { layer: 'qk-recipes' }],
  ['qk-breadcrumb__item', 'inline-flex min-w-0 max-w-full items-start gap-qk-inline', { layer: 'qk-recipes' }],
  ['qk-breadcrumb__link', ['box-border inline-flex min-w-0 max-w-full items-center gap-qk-inline-tight rounded-qk-control text-inherit no-underline [&[href]]:cursor-pointer [&[href]:hover]:text-qk-text-primary [&[href]:hover]:underline [&[aria-current=page]]:text-qk-text-primary [&[aria-disabled=true]]:text-qk-text-disabled [outline:none] [&[href]:focus-visible]:underline [&[href]:focus-visible]:underline-offset-4', { 'min-height': 'var(--qk-control-compact)', 'overflow-wrap': 'anywhere' }], { layer: 'qk-recipes' }],
  ['qk-breadcrumb__label', 'min-w-0', { layer: 'qk-recipes' }],
  ['qk-breadcrumb__adornment', 'inline-flex shrink-0 items-center', { layer: 'qk-recipes' }],
  ['qk-breadcrumb__separator', ['inline-flex shrink-0 items-center text-qk-icon-secondary', { height: 'var(--qk-control-compact)' }], { layer: 'qk-recipes' }],
  ['qk-breadcrumb__chevron', 'size-qk-icon [:dir(rtl)>&]:rotate-180', { layer: 'qk-recipes' }],
  ['qk-breadcrumb__popover', [{ width: 'max-content', 'max-width': 'min(calc(100vw - 2 * var(--qk-space-surface)), calc(var(--qk-space-major) * 7))' }], { layer: 'qk-recipes' }],
  ['qk-breadcrumb__surface', 'grid min-w-0 gap-qk-inline', { layer: 'qk-recipes' }],
  ['qk-breadcrumb__header', 'flex items-center justify-between gap-qk-inline', { layer: 'qk-recipes' }],
  ['qk-breadcrumb__hidden-list', ['m-0 grid min-w-0 list-none gap-qk-inline p-qk-inline-tight overflow-auto', { 'max-height': 'min(calc(100dvh - 4 * var(--qk-space-major)), calc(var(--qk-space-major) * 6))' }], { layer: 'qk-recipes' }],
  ['qk-breadcrumb__hidden-item', 'min-w-0', { layer: 'qk-recipes' }]
];
/** Public anatomy included in every CSS delivery path and the token atlas. */
export const breadcrumbRecipeCatalog = Object.freeze(breadcrumbShortcuts.map(shortcut => shortcut[0]));
