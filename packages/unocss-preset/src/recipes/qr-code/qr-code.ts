import type { UserShortcuts } from '@unocss/core';

/** Scan graphics keep fixed data colors; surrounding feedback uses semantic tokens. */
export const qrCodeShortcuts = [
  ['qk-qr-code', 'inline-flex min-w-0 max-w-full flex-col items-start gap-qk-surface-compact font-qk-product', { layer: 'qk-recipes' }],
  ['qk-qr-code__symbol', 'block max-w-full w-[var(--qk-qr-code-size)]', { layer: 'qk-recipes' }],
  ['qk-qr-code__frame', 'block h-auto w-full max-w-full', { layer: 'qk-recipes' }],
  ['qk-qr-code__fallback', 'box-border grid max-w-full w-[var(--qk-qr-code-size)] aspect-square place-items-center rounded-qk-control bg-qk-surface-subtle p-qk-surface-compact text-center text-qk-helper leading-qk-helper text-qk-text-secondary [overflow-wrap:anywhere]', { layer: 'qk-recipes' }],
  ['qk-qr-code__actions', 'flex min-w-0 max-w-full flex-wrap items-center gap-qk-inline', { layer: 'qk-recipes' }],
] satisfies UserShortcuts;

/** Public QR anatomy included in both generated CSS delivery modes. */
export const qrCodeRecipeCatalog = Object.freeze(qrCodeShortcuts.map(shortcut => shortcut[0]));
