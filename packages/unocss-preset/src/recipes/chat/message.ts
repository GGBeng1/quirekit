import type { StaticShortcut } from '@unocss/core';

/** Complete message hierarchy without applying bubble paint to media or process parts. */
export const messageShortcuts: StaticShortcut[] = [
  ['qk-chat-message', 'flex w-full min-w-0 mx-auto [max-width:var(--qk-chat-content-width,48rem)] text-qk-body leading-qk-body text-qk-text-primary [outline:none]', { layer: 'qk-recipes' }],
  ['qk-chat-message__avatar', 'inline-flex shrink-0', { layer: 'qk-recipes' }],
  ['qk-chat-message__body', 'min-w-0 max-w-full flex-1', { layer: 'qk-recipes' }],
  ['qk-chat-message__header', 'mb-qk-surface-compact flex flex-wrap items-center gap-qk-inline text-qk-compact leading-qk-compact font-qk-control', { layer: 'qk-recipes' }],
  ['qk-chat-message__meta', 'font-normal text-qk-helper leading-qk-helper text-qk-text-tertiary', { layer: 'qk-recipes' }],
  ['qk-chat-message__content', 'grid min-w-0 gap-qk-surface-compact [overflow-wrap:anywhere]', { layer: 'qk-recipes' }],
  ['qk-chat-message__footer', 'mt-qk-inline flex min-w-0 flex-wrap items-center gap-qk-inline', { layer: 'qk-recipes' }],
  ['qk-chat-message__status', 'mt-qk-inline flex items-center gap-qk-inline text-qk-helper leading-qk-helper text-qk-text-secondary [overflow-wrap:anywhere] data-[state=error]:text-qk-danger-text', { layer: 'qk-recipes' }],
  ['qk-chat-message__actions', 'flex min-w-0 flex-wrap items-center gap-qk-inline-tight', { layer: 'qk-recipes' }],
];

/** Logical alignment, independent content surfaces and progressive action emphasis. */
export const messageStaticCss = `
.qk-chat-message[data-align="end"] { flex-direction: row-reverse; }
.qk-chat-message[data-align="end"] > .qk-chat-message__body { margin-inline-start: auto; }
.qk-chat-message[data-align="end"] > .qk-chat-message__body,
.qk-chat-message[data-variant="soft"] > .qk-chat-message__body { flex: 0 1 auto; max-width: min(100%, 40rem); }
.qk-chat-message[data-align="end"] .qk-chat-message__header,
.qk-chat-message[data-align="end"] .qk-chat-message__footer,
.qk-chat-message[data-align="end"] .qk-chat-message__status { justify-content: flex-end; }
.qk-chat-message[data-variant="soft"] .qk-chat-message__content[data-mode="slot"],
.qk-chat-message[data-variant="soft"] .qk-chat-part[data-kind="text"] > .qk-chat-part__content { padding: var(--qk-space-surface-compact) var(--qk-space-surface); border-radius: var(--qk-radius-group); background: var(--qk-color-surface-subtle); }
.qk-chat-message__content > :is(.qk-chat-part[data-kind="reasoning"], .qk-chat-part[data-kind="tool"]) + :is(.qk-chat-part[data-kind="reasoning"], .qk-chat-part[data-kind="tool"]) { margin-block-start: calc(var(--qk-space-inline-tight) - var(--qk-space-surface-compact)); }
.qk-chat-message:focus-visible { background: var(--qk-color-surface-hover); }
@media (hover: hover) and (pointer: fine) {
  .qk-chat-message__footer[data-reveal]:not(:hover):not(:focus-within) { opacity: 0; }
  .qk-chat-message:is(:hover,:focus-within) .qk-chat-message__footer[data-reveal],
  .qk-chat-message__footer[data-reveal]:has([aria-expanded="true"]) { opacity: 1; }
}
`;
