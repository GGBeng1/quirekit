import type { StaticShortcut } from '@unocss/core';
import { composerShortcuts, composerStaticCss } from './composer';
import { messageShortcuts, messageStaticCss } from './message';
import { partShortcuts } from './part';
import { processShortcuts, processStaticCss } from './process';
import { actionShortcuts, actionStaticCss } from './actions';
import { decisionStaticCss } from './decision';

/** Chat composition owns reading rhythm and the shared composer field boundary. */
export const chatShortcuts: StaticShortcut[] = [
  ['qk-chat-message-list', 'relative min-h-0 min-w-0 font-qk-product text-qk-body leading-qk-body text-qk-text-primary', { layer: 'qk-recipes' }],
  ['qk-chat-message-list__area', 'h-full min-h-0', { layer: 'qk-recipes' }],
  ['qk-chat-message-list__viewport', '[overflow-anchor:none] overscroll-contain', { layer: 'qk-recipes' }],
  ['qk-chat-message-list__content', 'box-border min-w-0 w-full mx-auto p-qk-surface [max-width:calc(var(--qk-chat-content-width,48rem)+2*var(--qk-space-surface))]', { layer: 'qk-recipes' }],
  ['qk-chat-message-list__list', 'grid min-w-0 gap-qk-group', { layer: 'qk-recipes' }],
  ['qk-chat-message-list__item', 'min-w-0', { layer: 'qk-recipes' }],
  ['qk-chat-message-list__history', 'flex justify-center pb-qk-surface', { layer: 'qk-recipes' }],
  ['qk-chat-message-list__empty', 'flex min-h-40 items-center justify-center', { layer: 'qk-recipes' }],
  ['qk-chat-message-list__latest', 'absolute bottom-qk-inline [inset-inline-end:var(--qk-space-surface)]', { layer: 'qk-recipes' }],
  ...messageShortcuts,
  ...partShortcuts,
  ...processShortcuts,
  ...actionShortcuts,
  ...composerShortcuts
];

/** Standalone CSS and token discovery use the same public anatomy. */
export const chatRecipeCatalog = Object.freeze(chatShortcuts.map(shortcut => shortcut[0]));

/** Logical alignment and soft message surfaces do not depend on business roles. */
export const chatStaticCss = `${messageStaticCss}${processStaticCss}${actionStaticCss}${composerStaticCss}${decisionStaticCss}`;
