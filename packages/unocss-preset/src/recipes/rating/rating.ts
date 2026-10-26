import type { UserShortcuts } from '@unocss/core';

/** Published score anatomy and optical scale variants. */
export const ratingRecipeCatalog = Object.freeze([
  'qk-rating',
  'qk-rating__label', 'qk-rating__required', 'qk-rating__row', 'qk-rating__control',
  'qk-rating__item', 'qk-rating__item--sm', 'qk-rating__item--md', 'qk-rating__item--lg',
  'qk-rating__glyph', 'qk-rating__fill', 'qk-rating__value'
]);

/** Token-based rating glyphs, clear committed state and quiet keyboard backgrounds. */
export const ratingShortcuts = [
  ['qk-rating', 'relative grid min-w-0 max-w-full gap-qk-inline text-qk-control leading-qk-control font-qk-product text-qk-text-primary', { layer: 'qk-recipes' }],
  ['qk-rating__label', 'min-w-0 font-medium text-qk-text-secondary', { layer: 'qk-recipes' }],
  ['qk-rating__required', 'ms-0.5 text-qk-danger-foreground', { layer: 'qk-recipes' }],
  ['qk-rating__row', 'flex min-w-0 max-w-full flex-wrap items-center gap-qk-inline', { layer: 'qk-recipes' }],
  ['qk-rating__control', 'flex min-w-0 max-w-full flex-wrap items-center', { layer: 'qk-recipes' }],
  ['qk-rating__item', 'grid shrink-0 cursor-pointer touch-manipulation select-none place-items-center rounded-qk-control [outline:none] focus-visible:bg-qk-action-soft data-[readonly]:cursor-default data-[disabled]:cursor-not-allowed data-[disabled]:text-qk-text-disabled [@media(pointer:coarse)]:min-h-11 [@media(pointer:coarse)]:min-w-11', { layer: 'qk-recipes' }],
  ['qk-rating__item--sm', 'size-6', { layer: 'qk-recipes' }],
  ['qk-rating__item--md', 'size-7', { layer: 'qk-recipes' }],
  ['qk-rating__item--lg', 'size-8', { layer: 'qk-recipes' }],
  ['qk-rating__glyph', 'pointer-events-none relative inline-flex text-qk-border-strong [@media(forced-colors:active)]:[color:CanvasText]', { layer: 'qk-recipes' }],
  ['qk-rating__fill', 'absolute inset-y-0 start-0 inline-flex w-0 overflow-hidden text-qk-action-primary [&_svg]:fill-current [[data-highlighted]:not([data-half])_&]:w-full [[data-half]_&]:w-1/2 [[data-disabled]_&]:text-qk-text-disabled [@media(forced-colors:active)]:[color:Highlight]', { layer: 'qk-recipes' }],
  ['qk-rating__value', 'min-w-0 text-qk-helper leading-qk-helper tabular-nums text-qk-text-secondary [[data-invalid]_&]:text-qk-danger-foreground', { layer: 'qk-recipes' }]
] satisfies UserShortcuts;
