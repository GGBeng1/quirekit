import type { StaticShortcut } from '@unocss/core';

/** Image presentation and the full-viewport reading surface share semantic theme roles. */
export const imagePreviewShortcuts: StaticShortcut[] = [
  ['qk-image', 'relative inline-grid max-w-full min-h-12 min-w-12 overflow-hidden align-middle rounded-qk-control bg-qk-surface-subtle', { layer: 'qk-recipes' }],
  ['qk-image__media', 'block w-full h-full min-h-0 min-w-0 max-w-full', { layer: 'qk-recipes' }],
  ['qk-image__placeholder', 'absolute inset-0 grid place-content-center text-qk-text-muted bg-qk-surface-subtle', { layer: 'qk-recipes' }],
  ['qk-image__error', 'absolute inset-0 flex flex-col items-center justify-center gap-2 text-qk-helper text-qk-text-secondary bg-qk-surface-subtle', { layer: 'qk-recipes' }],
  ['qk-image__trigger', 'absolute inset-0 border-0 p-0 bg-transparent cursor-zoom-in [outline:none] focus-visible:[filter:brightness(0.85)]', { layer: 'qk-recipes' }],
  ['qk-image__hint', 'absolute bottom-2 right-2 inline-flex items-center gap-1 px-2 py-1 rounded-qk-control bg-qk-surface-overlay text-qk-text-primary shadow-qk-raised text-qk-helper', { layer: 'qk-recipes' }],
  ['qk-image-preview', ['fixed inset-0 grid grid-rows-[auto_minmax(0,1fr)_auto] overflow-hidden isolate bg-transparent text-qk-text-primary [outline:none]', { height: '100dvh', 'z-index': 'calc(var(--qk-layer-modal) + 2)' }], { layer: 'qk-recipes' }],
  ['qk-image-preview__mask', 'absolute inset-0 pointer-events-none', { layer: 'qk-recipes' }],
  ['qk-image-preview__header', 'flex items-center justify-between gap-3 px-5 py-3', { layer: 'qk-recipes' }],
  ['qk-image-preview__heading', 'flex min-w-0 items-center gap-3', { layer: 'qk-recipes' }],
  ['qk-image-preview__title', 'm-0 truncate text-qk-body font-semibold', { layer: 'qk-recipes' }],
  ['qk-image-preview__count', 'shrink-0 font-qk-control text-qk-button-md leading-qk-button-md text-qk-text-secondary tabular-nums', { layer: 'qk-recipes' }],
  ['qk-image-preview__close', 'shrink-0', { layer: 'qk-recipes' }],
  ['qk-image-preview__body', ['relative min-h-0 min-w-0', { 'padding-inline': 'var(--qk-preview-gutter,16px)' }], { layer: 'qk-recipes' }],
  ['qk-image-preview__stage', 'relative h-full w-full overflow-hidden touch-none select-none', { layer: 'qk-recipes' }],
  ['qk-image-preview__image', ['absolute left-1/2 top-1/2 block max-w-none select-none', { 'user-drag': 'none', '-webkit-user-drag': 'none' }], { layer: 'qk-recipes' }],
  ['qk-image-preview__status', 'absolute inset-0 flex flex-col items-center justify-center gap-3 text-qk-body text-qk-text-secondary', { layer: 'qk-recipes' }],
  ['qk-image-preview__loading', 'h-6 w-6 rounded-full border-2 border-solid border-qk-border-default border-t-qk-text-accent animate-spin motion-reduce:animate-none', { layer: 'qk-recipes' }],
  ['qk-image-preview__previous', 'absolute left-4 top-1/2 -translate-y-1/2', { layer: 'qk-recipes' }],
  ['qk-image-preview__next', 'absolute right-4 top-1/2 -translate-y-1/2', { layer: 'qk-recipes' }],
  ['qk-image-preview__footer', ['grid justify-items-center gap-2 px-3 pt-2 min-w-0', { 'padding-bottom': 'max(clamp(32px,6dvh,80px),env(safe-area-inset-bottom))' }], { layer: 'qk-recipes' }],
  ['qk-image-preview__caption', 'm-0 max-w-full text-center text-qk-helper text-qk-text-secondary max-h-12 overflow-auto', { layer: 'qk-recipes' }],
  ['qk-image-preview__tools', 'flex flex-wrap items-center justify-center gap-3 px-3 py-2 rounded-qk-control max-w-full', { layer: 'qk-recipes' }],
  ['qk-image-preview__scale', ['tabular-nums min-w-[4ch]', { '--qk-button-md-padding-inline': '0px' }], { layer: 'qk-recipes' }],
  ['qk-image-preview__divider', 'h-4 w-px shrink-0 bg-qk-border-subtle mx-1', { layer: 'qk-recipes' }],
  ['qk-image-preview__thumbnails', 'flex max-w-full gap-2 overflow-x-auto p-1', { layer: 'qk-recipes' }],
  ['qk-image-preview__thumbnail', 'relative shrink-0 w-16 h-12 overflow-hidden rounded-qk-control border border-solid border-qk-border-subtle bg-qk-surface-subtle p-0 cursor-pointer [outline:none] focus-visible:[filter:brightness(0.85)]', { layer: 'qk-recipes' }]
];
/** Public anatomy included in standalone CSS. */
export const imagePreviewRecipeCatalog = Object.freeze(imagePreviewShortcuts.map(shortcut => shortcut[0]));
/** Stateful geometry and responsive target sizes that cannot be expressed by variant props. */
export const imagePreviewStaticCss = [
  '.qk-image__media[data-load-state=error]{visibility:hidden}',
  '.qk-image__trigger:not(:hover):not(:focus-visible) .qk-image__hint{opacity:0}',
  '.qk-image-preview__stage[data-ready=true]{cursor:zoom-in}',
  '.qk-image-preview__stage[data-zoomed=true]{cursor:grab}',
  '.qk-image-preview__stage[data-dragging=true]{cursor:grabbing}',
  '.qk-image-preview__image[data-load-state=error]{visibility:hidden}',
  '.qk-image-preview__mask{background:var(--qk-preview-mask-color);opacity:var(--qk-preview-mask-opacity)}',
  '.qk-image-preview{backdrop-filter:blur(var(--qk-preview-mask-blur))}',
  '.qk-image-preview__header,.qk-image-preview__body,.qk-image-preview__footer{position:relative;z-index:1}',
  '.qk-image-preview__tools{background:var(--qk-color-surface-overlay)}',
  '.qk-image-preview__header{background:linear-gradient(to bottom,color-mix(in srgb,var(--qk-preview-mask-color) 70%,transparent),transparent)}',
  '.qk-image-preview__footer{background:linear-gradient(to top,color-mix(in srgb,var(--qk-preview-mask-color) 70%,transparent),transparent)}',
  '.qk-image-preview__header,.qk-image-preview__caption{text-shadow:0 1px 2px var(--qk-preview-mask-color)}',
  '.qk-image-preview .qk-icon-button{position:relative}',
  '.qk-image-preview .qk-icon-button::after{content:"";position:absolute;inset:50% auto auto 50%;width:max(100%,44px);height:max(100%,44px);transform:translate(-50%,-50%)}',
  '.qk-image-preview .qk-image-preview__previous,.qk-image-preview .qk-image-preview__next{position:absolute}',
  '.qk-image-preview__body[data-navigation=true]{--qk-preview-gutter:72px}',
  '.qk-image-preview .qk-button{flex-shrink:0}',
  '.qk-image-preview__thumbnail img{display:block;width:100%;height:100%;object-fit:cover}',
  '.qk-image-preview__thumbnail[aria-current=true]{border-color:var(--qk-color-border-focus);box-shadow:0 0 0 1px var(--qk-color-border-focus)}',
  '.qk-image-preview__header{padding-top:max(12px,env(safe-area-inset-top))}',
  '@media(max-width:600px){.qk-image-preview__body[data-navigation=true]{--qk-preview-gutter:52px}.qk-image-preview__header{padding-inline:12px}.qk-image-preview__heading{display:grid;gap:0}.qk-image-preview__thumbnail{width:52px;height:40px}.qk-image-preview__previous{left:8px}.qk-image-preview__next{right:8px}.qk-image-preview__caption{max-height:2.8em}}'
].join('');
