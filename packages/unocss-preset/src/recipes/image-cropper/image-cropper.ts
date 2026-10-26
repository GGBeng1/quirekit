import type { UserShortcuts } from '@unocss/core';
/** Public image-cropper anatomy, independent of editor and media ownership. */
export const imageCropperRecipeCatalog = Object.freeze([
  'qk-image-cropper', 'qk-image-cropper__toolbar', 'qk-image-cropper__ratio', 'qk-image-cropper__reset',
  'qk-image-cropper__stage', 'qk-image-cropper__session', 'qk-image-cropper__viewport', 'qk-image-cropper__image',
  'qk-image-cropper__selection', 'qk-image-cropper__grid', 'qk-image-cropper__handle',
  'qk-image-cropper__footer', 'qk-image-cropper__zoom', 'qk-image-cropper__dimensions',
  'qk-image-cropper__help', 'qk-image-cropper__status'
]);
/** Crop canvas styling; primary handles with white borders remain visible over image content. */
export const imageCropperShortcuts = [
  ['qk-image-cropper', 'grid min-w-0 w-full gap-qk-surface-compact font-qk-product text-qk-body text-qk-text-primary', { layer: 'qk-recipes' }],
  ['qk-image-cropper__toolbar', 'flex flex-wrap items-center gap-qk-inline', { layer: 'qk-recipes' }],
  ['qk-image-cropper__ratio', 'w-28', { layer: 'qk-recipes' }],
  ['qk-image-cropper__reset', 'ms-auto', { layer: 'qk-recipes' }],
  ['qk-image-cropper__stage', 'grid min-w-0 place-items-center overflow-hidden rounded-qk-control bg-qk-surface-subtle p-0', { layer: 'qk-recipes' }],
  ['qk-image-cropper__session', 'relative max-w-full', { layer: 'qk-recipes' }],
  ['qk-image-cropper__viewport', 'h-full w-full cursor-grab', { layer: 'qk-recipes' }],
  ['qk-image-cropper__image', 'absolute inset-0 block h-full w-full max-w-none', { layer: 'qk-recipes' }],
  ['qk-image-cropper__selection', 'box-border cursor-move border border-solid border-white [box-shadow:0_0_0_9999px_rgb(0_0_0/0.48)] [outline:none] focus-visible:border-qk-action-primary', { layer: 'qk-recipes' }],
  ['qk-image-cropper__grid', 'border-0 border-solid border-white/45 data-[axis=horizontal]:border-y data-[axis=vertical]:border-x', { layer: 'qk-recipes' }],
  ['qk-image-cropper__handle', 'z-1 flex h-7 w-7 items-center justify-center [&>span]:box-border [&>span]:h-2.5 [&>span]:w-2.5 [&>span]:rounded-sm [&>span]:border [&>span]:border-solid [&>span]:border-white [&>span]:bg-qk-action-primary [&>span]:shadow-sm [@media(pointer:coarse)]:h-11 [@media(pointer:coarse)]:w-11', { layer: 'qk-recipes' }],
  ['qk-image-cropper__footer', 'flex flex-wrap items-center gap-qk-surface', { layer: 'qk-recipes' }],
  ['qk-image-cropper__zoom', 'min-w-40 max-w-full flex-1', { layer: 'qk-recipes' }],
  ['qk-image-cropper__dimensions', 'text-qk-helper text-qk-text-secondary tabular-nums', { layer: 'qk-recipes' }],
  ['qk-image-cropper__help', 'm-0 text-qk-helper leading-qk-helper text-qk-text-secondary', { layer: 'qk-recipes' }],
  ['qk-image-cropper__status', 'flex flex-col items-center gap-qk-surface-compact p-qk-surface text-qk-text-secondary', { layer: 'qk-recipes' }]
] satisfies UserShortcuts;
