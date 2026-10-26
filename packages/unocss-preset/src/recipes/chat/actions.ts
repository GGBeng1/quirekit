import type { StaticShortcut } from '@unocss/core';

/** Message actions own low emphasis through the public Button variable contract. */
export const actionShortcuts: StaticShortcut[] = [
  ['qk-chat-actions', 'flex min-w-0 flex-wrap items-center gap-qk-inline-tight [outline:none] focus-visible:bg-qk-surface-hover', { layer: 'qk-recipes' }],
  ['qk-chat-action', '[--qk-button-neutral-foreground:var(--qk-color-text-muted)] [--qk-button-xs-icon-size:14px]', { layer: 'qk-recipes' }],
  ['qk-chat-action__icon', '[&.qk-icon]:w-full [&.qk-icon]:h-full', { layer: 'qk-recipes' }],
  ['qk-chat-branch', 'flex shrink-0 items-center gap-qk-inline-tight text-qk-text-tertiary', { layer: 'qk-recipes' }],
  ['qk-chat-branch__position', 'text-qk-helper leading-qk-helper tabular-nums whitespace-nowrap [outline:none] focus-visible:bg-qk-surface-hover rounded-qk-control', { layer: 'qk-recipes' }]
];

/** Progressive emphasis keeps geometry and touch/keyboard access intact. */
export const actionStaticCss = `
.qk-chat-action[data-emphasis="muted"]:is(:hover,:focus-visible,[aria-pressed="true"]):not(:disabled) { --qk-button-neutral-foreground: var(--qk-color-text-primary); }
.qk-chat-action[aria-pressed="true"] { background: var(--qk-color-surface-selected); }
@media (hover: hover) and (pointer: fine) {
  .qk-chat-actions[data-reveal]:not(:hover):not(:focus-within) { opacity: 0; }
  .qk-chat-message:is(:hover,:focus-within) .qk-chat-actions[data-reveal],
  .qk-chat-actions[data-reveal]:has([aria-expanded="true"]) { opacity: 1; }
}
@media (pointer: coarse) {
  .qk-chat-action.qk-button { min-width: 44px; min-height: 44px; }
}
`;
