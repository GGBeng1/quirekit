/** Read-only terminal output keeps a calm surface and a bounded scrolling viewport. */
export const terminalOutputStaticCss = `
.qk-terminal-output { min-width: 0; overflow: hidden; border: 1px solid var(--qk-color-border-subtle); border-radius: var(--qk-radius-group); background: var(--qk-color-surface-subtle); color: var(--qk-color-text-primary); }
.qk-terminal-output__toolbar { display: flex; min-height: 2rem; align-items: center; gap: .5rem; padding-inline: .75rem .375rem; }
.qk-terminal-output__status { min-width: 0; color: var(--qk-color-text-tertiary); font-size: var(--qk-type-helper-font-size); }
.qk-terminal-output__status[data-state="failed"] { color: var(--qk-color-danger-text); }
.qk-terminal-output__status[data-state="succeeded"] { color: var(--qk-color-success-text); }
.qk-terminal-output__tools { display: inline-flex; align-items: center; gap: .125rem; margin-inline-start: auto; }
.qk-terminal-output__viewport { min-width: 0; overflow: auto; border-top: 1px solid var(--qk-color-border-subtle); outline: none; overscroll-behavior: contain; }
.qk-terminal-output__viewport:focus-visible { background: var(--qk-color-surface-hover); }
.qk-terminal-output__content { width: max-content; min-width: 100%; margin: 0; padding: .625rem .75rem; box-sizing: border-box; font-family: var(--qk-type-code-font-family); font-size: var(--qk-type-compact-font-size); line-height: 1.6; white-space: pre; tab-size: 4; }
.qk-terminal-output__content [data-stream="stderr"]:not([data-color]) { color: var(--qk-color-danger-text); }
.qk-terminal-output__content [data-bold] { font-weight: 700; }
.qk-terminal-output__content [data-dim] { opacity: .7; }
.qk-terminal-output__content [data-underline] { text-decoration: underline; }
.qk-terminal-output__content [data-color="black"], .qk-terminal-output__content [data-color="bright-black"] { color: var(--qk-color-text-tertiary); }
.qk-terminal-output__content [data-color="red"], .qk-terminal-output__content [data-color="bright-red"] { color: var(--qk-color-danger-text); }
.qk-terminal-output__content [data-color="green"], .qk-terminal-output__content [data-color="bright-green"] { color: var(--qk-color-success-text); }
.qk-terminal-output__content [data-color="yellow"], .qk-terminal-output__content [data-color="bright-yellow"] { color: var(--qk-color-warning-text); }
.qk-terminal-output__content [data-color="blue"], .qk-terminal-output__content [data-color="bright-blue"] { color: var(--qk-color-action-text); }
.qk-terminal-output__content [data-color="magenta"], .qk-terminal-output__content [data-color="bright-magenta"] { color: var(--qk-color-info-text); }
.qk-terminal-output__content [data-color="cyan"], .qk-terminal-output__content [data-color="bright-cyan"] { color: var(--qk-color-info-text); }
.qk-terminal-output__content [data-color="white"], .qk-terminal-output__content [data-color="bright-white"] { color: var(--qk-color-text-primary); }
.qk-terminal-output__clipped, .qk-terminal-output__empty { color: var(--qk-color-text-tertiary); }
.qk-terminal-output__foot { display: flex; min-height: 1.75rem; align-items: center; gap: .5rem; padding: .125rem .5rem .25rem .75rem; border-top: 1px solid var(--qk-color-border-subtle); }
.qk-terminal-output__truncated { color: var(--qk-color-warning-text); font-size: var(--qk-type-helper-font-size); }
.qk-terminal-output__follow { margin-inline-start: auto; }
.qk-terminal-output > .qk-code-block { border: 0; border-top: 1px solid var(--qk-color-border-subtle); border-radius: 0; }
`;
