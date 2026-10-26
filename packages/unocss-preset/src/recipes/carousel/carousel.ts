import type { UserShortcuts } from '@unocss/core';

/** Content carousel anatomy, independent of slotted document design. */
export const carouselRecipeCatalog = Object.freeze([
  'qk-carousel', 'qk-carousel__viewport', 'qk-carousel__item', 'qk-carousel__footer',
  'qk-carousel__progress', 'qk-carousel__indicators', 'qk-carousel__indicator',
  'qk-carousel__controls', 'qk-carousel__controls--keyboard', 'qk-carousel__empty',
  'qk-carousel--card', 'qk-carousel__stage', 'qk-carousel__card', 'qk-carousel__card-body', 'qk-carousel__nav',
  'qk-carousel__nav--previous', 'qk-carousel__nav--next', 'qk-carousel__footer--card'
]);

/** Quiet page navigation with separate optical marks and pointer targets. */
export const carouselShortcuts = [
  ['qk-carousel', 'grid min-w-0 w-full max-w-full gap-qk-surface-compact font-qk-product text-qk-body leading-qk-body text-qk-text-primary', { layer: 'qk-recipes' }],
  ['qk-carousel__viewport', 'min-w-0 max-w-full [outline:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden data-[dragging]:cursor-grabbing data-[dragging]:select-none', { layer: 'qk-recipes' }],
  ['qk-carousel__item', 'min-w-0 min-h-0 [overflow-wrap:anywhere]', { layer: 'qk-recipes' }],
  ['qk-carousel__footer', 'flex min-w-0 flex-wrap items-center gap-qk-inline', { layer: 'qk-recipes' }],
  ['qk-carousel__progress', 'shrink-0 text-qk-helper leading-qk-helper tabular-nums text-qk-text-secondary', { layer: 'qk-recipes' }],
  ['qk-carousel__indicators', 'flex min-w-0 flex-1 flex-wrap items-center justify-center', { layer: 'qk-recipes' }],
  ['qk-carousel__indicator', 'grid h-8 w-8 cursor-pointer place-items-center rounded-qk-control border-0 bg-transparent p-0 [outline:none] focus-visible:bg-qk-action-soft hover:bg-qk-surface-hover disabled:cursor-not-allowed disabled:opacity-50 [&>span]:block [&>span]:h-1.5 [&>span]:w-1.5 [&>span]:rounded-full [&>span]:bg-qk-border-strong [&[data-current]>span]:w-4 [&[data-current]>span]:bg-qk-text-secondary [@media(pointer:coarse)]:min-h-11 [@media(pointer:coarse)]:min-w-11', { layer: 'qk-recipes' }],
  ['qk-carousel__controls', 'ms-auto flex shrink-0 items-center gap-qk-inline', { layer: 'qk-recipes' }],
  ['qk-carousel__controls--keyboard', 'sr-only focus-within:not-sr-only', { layer: 'qk-recipes' }],
  ['qk-carousel__empty', 'col-span-full py-qk-group text-qk-text-secondary', { layer: 'qk-recipes' }],
  // Card effect: the centered card leads; receding neighbors dim under a page-colored veil and stay clickable.
  ['qk-carousel--card', 'gap-qk-surface', { layer: 'qk-recipes' }],
  // Cards share one grid cell, so the stage takes the tallest card's height unless a fixed height stretches them.
  ['qk-carousel__stage', 'relative grid min-w-0 items-center overflow-hidden py-qk-surface [grid-template-rows:minmax(0,1fr)] [outline:none] data-[fixed]:items-stretch', { layer: 'qk-recipes' }],
  ['qk-carousel__card', 'relative [grid-area:1/1] justify-self-center w-[var(--qk-carousel-card-width,50%)] cursor-pointer [transform-origin:center] [transition:transform_var(--qk-motion-overlay-duration)_var(--qk-motion-standard-easing),opacity_var(--qk-motion-overlay-duration)_var(--qk-motion-standard-easing)] after:absolute after:inset-0 after:rounded-qk-group after:bg-qk-surface-page after:opacity-45 after:content-[""] after:pointer-events-none after:[transition:opacity_var(--qk-motion-overlay-duration)] data-[current]:cursor-default data-[current]:after:opacity-0 [[data-reduced-motion]_&]:transition-none', { layer: 'qk-recipes' }],
  ['qk-carousel__card-body', 'h-full min-w-0 overflow-hidden rounded-qk-group border border-qk-border-subtle bg-qk-surface-raised shadow-qk-overlay [overflow-wrap:anywhere]', { layer: 'qk-recipes' }],
  ['qk-carousel__nav', 'absolute top-1/2 z-20 -translate-y-1/2 shadow-qk-overlay [&.qk-button]:bg-qk-surface-raised [&.qk-button:hover:not(:disabled)]:bg-qk-surface-hover', { layer: 'qk-recipes' }],
  ['qk-carousel__nav--previous', 'start-qk-surface', { layer: 'qk-recipes' }],
  ['qk-carousel__nav--next', 'end-qk-surface', { layer: 'qk-recipes' }],
  ['qk-carousel__footer--card', 'justify-center', { layer: 'qk-recipes' }]
] satisfies UserShortcuts;
