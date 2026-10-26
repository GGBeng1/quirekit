import type { StaticShortcut } from '@unocss/core';

/** Compact process rows and full-width prose share one message reading rhythm. */
export const partShortcuts: StaticShortcut[] = [
  ['qk-chat-part', 'min-w-0 [outline:none] focus-visible:bg-qk-surface-hover', { layer: 'qk-recipes' }],
  ['qk-chat-part__content', 'grid min-w-0 gap-qk-inline', { layer: 'qk-recipes' }],
  ['qk-chat-part__text', 'min-w-0 whitespace-pre-wrap [overflow-wrap:anywhere]', { layer: 'qk-recipes' }],
  ['qk-chat-part__hint', 'm-0 text-qk-helper leading-qk-helper text-qk-text-secondary [overflow-wrap:anywhere]', { layer: 'qk-recipes' }],
  ['qk-chat-part__error', 'flex min-w-0 items-start gap-qk-inline text-qk-helper leading-qk-helper text-qk-danger-text [overflow-wrap:anywhere]', { layer: 'qk-recipes' }]
];
