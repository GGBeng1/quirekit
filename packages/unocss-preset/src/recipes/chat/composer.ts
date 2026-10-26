import type { StaticShortcut } from '@unocss/core';
import { controlFocusWithin } from '../control/focus';

/** Composer alone owns the field surface; embedded Textarea does not add a second boundary. */
export const composerShortcuts: StaticShortcut[] = [
  ['qk-chat-composer', 'grid w-full min-w-0 mx-auto [max-width:var(--qk-chat-content-width,48rem)] gap-qk-inline font-qk-product text-qk-body leading-qk-body text-qk-text-primary', { layer: 'qk-recipes' }],
  ['qk-chat-composer__surface', `flex flex-wrap min-w-0 items-end gap-qk-inline p-qk-surface-compact border border-solid border-qk-border-subtle rounded-qk-dialog bg-qk-surface-page ${controlFocusWithin}`, { layer: 'qk-recipes' }],
  ['qk-chat-composer__header', 'basis-full min-w-0 px-qk-inline text-qk-helper leading-qk-helper text-qk-text-secondary', { layer: 'qk-recipes' }],
  ['qk-chat-composer__editor', 'flex min-w-0 items-start [flex:1_1_100%]', { layer: 'qk-recipes' }],
  ['qk-chat-composer__leading', 'flex shrink-0 items-center self-start pt-qk-inline ps-qk-inline text-qk-text-secondary', { layer: 'qk-recipes' }],
  ['qk-chat-composer__input', 'flex min-w-0 flex-1', { layer: 'qk-recipes' }],
  ['qk-chat-composer__bar', 'flex min-w-0 flex-wrap items-center gap-qk-inline [flex:1_1_100%]', { layer: 'qk-recipes' }],
  ['qk-chat-composer__tools', 'flex min-w-0 flex-wrap items-center gap-qk-inline-tight', { layer: 'qk-recipes' }],
  ['qk-chat-composer__trailing', 'flex min-w-0 max-w-full items-center gap-qk-inline-tight ms-auto', { layer: 'qk-recipes' }],
  ['qk-chat-composer__actions', 'flex min-w-0 flex-wrap justify-end items-center gap-qk-inline-tight', { layer: 'qk-recipes' }],
  ['qk-chat-composer__submit', 'flex shrink-0 items-center', { layer: 'qk-recipes' }],
  ['qk-chat-composer__footer', 'min-w-0 px-qk-inline text-qk-helper leading-qk-helper text-qk-text-secondary [overflow-wrap:anywhere]', { layer: 'qk-recipes' }],
  ['qk-chat-rich-input', 'relative w-full min-w-0', { layer: 'qk-recipes' }],
  ['qk-chat-rich-input__candidates', 'fixed z-50 overflow-auto', { layer: 'qk-recipes' }],
  ['qk-candidate-list', 'max-h-64 overflow-auto border border-solid border-qk-border-subtle rounded-qk-dialog bg-qk-surface-page p-qk-inline-tight shadow-qk-raised', { layer: 'qk-recipes' }],
  ['qk-candidate-list__item', 'flex min-w-0 cursor-pointer items-center gap-qk-inline rounded-qk-control px-qk-inline py-qk-inline-tight text-qk-body text-qk-text-primary', { layer: 'qk-recipes' }],
  ['qk-candidate-list__label', 'min-w-0 truncate', { layer: 'qk-recipes' }],
  ['qk-candidate-list__description', 'ms-auto min-w-0 truncate text-qk-helper text-qk-text-secondary', { layer: 'qk-recipes' }]
];

/** Variants rearrange stable DOM; logical alignment supports narrow containers and RTL. */
export const composerStaticCss = `
.qk-chat-composer[data-variant="elevated"] > .qk-chat-composer__surface { box-shadow: var(--qk-elevation-raised); }
.qk-chat-composer[data-variant="soft"] > .qk-chat-composer__surface { background: var(--qk-color-surface-subtle); border-color: transparent; }
.qk-chat-composer[data-file-dragging] > .qk-chat-composer__surface { border-color: var(--qk-color-border-focus); outline: 1px solid var(--qk-color-border-focus); outline-offset: -1px; }
.qk-chat-composer[data-layout="inline"] > .qk-chat-composer__surface { align-items: center; padding: var(--qk-space-inline); gap: var(--qk-space-inline-tight); }
.qk-chat-composer[data-layout="inline"] .qk-chat-composer__editor { flex: 1 1 10rem; }
.qk-chat-composer[data-layout="inline"] .qk-chat-composer__leading { align-self: center; padding-block-start: 0; }
.qk-chat-composer[data-layout="inline"] .qk-chat-composer__bar { flex: 0 1 auto; margin-inline-start: auto; }
.qk-chat-composer[data-density="compact"] > .qk-chat-composer__surface { padding: var(--qk-space-inline); gap: var(--qk-space-inline-tight); border-radius: var(--qk-radius-group); }
.qk-chat-composer[data-disabled] > .qk-chat-composer__surface { border-color: var(--qk-color-border-disabled); background: var(--qk-color-surface-disabled); }
.qk-chat-composer[data-readonly] > .qk-chat-composer__surface { background: var(--qk-color-surface-subtle); }
.qk-candidate-list__item[data-active] { background: var(--qk-color-surface-subtle); }
.qk-candidate-list__item:not([aria-disabled="true"]):hover { background: var(--qk-color-surface-hover); }
.qk-candidate-list__item[aria-disabled="true"] { opacity: .5; cursor: default; }
`;
