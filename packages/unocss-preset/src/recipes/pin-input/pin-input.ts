import type { UserShortcuts } from '@unocss/core';
import { controlSizeShortcuts } from '../control/sizes';

/** Shared field tokens keep each input aligned with neighboring controls. */
export const pinInputShortcuts = [
  ['qk-pin-input', 'relative inline-flex min-w-0 max-w-full text-qk-text-primary', { layer: 'qk-recipes' }],
  ...controlSizeShortcuts('qk-pin-input', 'content'),
  ['qk-pin-input__control', 'inline-flex max-w-full items-center gap-qk-inline overflow-x-auto', { layer: 'qk-recipes' }],
  ['qk-pin-input__input', [
    'box-border shrink-0 appearance-none border border-solid border-qk-border-default bg-qk-surface-page p-0 text-center text-inherit outline-0 shadow-none placeholder:text-qk-text-placeholder placeholder:opacity-100',
    'hover:border-qk-border-strong focus:border-qk-border-focus',
    'data-[invalid]:border-qk-danger-border data-[invalid]:focus:border-qk-danger-text',
    'disabled:cursor-not-allowed disabled:border-qk-border-disabled disabled:bg-qk-surface-disabled disabled:text-qk-text-disabled disabled:placeholder:text-qk-text-disabled',
    { width: 'var(--qk-control-size-height)', height: 'var(--qk-control-size-height)', 'border-radius': 'var(--qk-radius-control)', 'font-variant-numeric': 'tabular-nums' }
  ], { layer: 'qk-recipes' }]
] satisfies UserShortcuts;

/** Stable anatomy classes emitted by both UnoCSS and the standalone stylesheet. */
export const pinInputRecipeCatalog = Object.freeze(pinInputShortcuts.map(shortcut => shortcut[0] as string));
