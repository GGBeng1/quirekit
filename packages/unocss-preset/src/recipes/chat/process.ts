import type { StaticShortcut } from '@unocss/core';

/** Quiet process summaries share geometry across reasoning, tools and process groups. */
export const processShortcuts: StaticShortcut[] = [
  ['qk-chat-process', 'min-w-0 [outline:none] focus-visible:bg-qk-surface-hover', { layer: 'qk-recipes' }],
  ['qk-chat-process__summary', 'flex min-w-0 items-center gap-qk-inline font-normal text-qk-helper leading-qk-helper text-inherit data-[state=failed]:text-qk-danger-text data-[state=error]:text-qk-danger-text data-[state=waiting]:text-qk-warning-text', { layer: 'qk-recipes' }],
  ['qk-chat-process__title', 'min-w-0 truncate', { layer: 'qk-recipes' }],
  ['qk-chat-process__preview', 'min-w-0 max-w-[24rem] truncate', { layer: 'qk-recipes' }],
  ['qk-chat-process__state', 'min-w-0 max-w-[12rem] truncate', { layer: 'qk-recipes' }],
  ['qk-chat-process__meta', 'min-w-0 max-w-[12rem] truncate tabular-nums', { layer: 'qk-recipes' }],
  ['qk-chat-process__details', 'grid min-w-0 gap-qk-inline pb-qk-inline text-qk-compact leading-qk-compact text-qk-text-tertiary', { layer: 'qk-recipes' }],
  ['qk-chat-process__details--steps', 'px-0', { layer: 'qk-recipes' }],
  ['qk-chat-process__details--detail', 'px-0', { layer: 'qk-recipes' }],
  ['qk-chat-process__attention', 'grid min-w-0 gap-qk-inline pt-qk-inline-tight', { layer: 'qk-recipes' }]
];

/** The Chat disclosure owns a flush reading edge without changing standalone Collapsible spacing. */
export const processStaticCss = `
.qk-chat-process > .qk-collapsible > .qk-collapsible__trigger--plain {
  padding-inline: 0 !important;
  border-inline-width: 0;
}
.qk-chat-process__attention .qk-chat-action:not(.qk-icon-button) {
  padding-inline-start: 0;
  border-inline-start-width: 0;
}
`;
