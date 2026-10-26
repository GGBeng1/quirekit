/** Quiet, theme-owned surfaces for read-only JSON trees and unified diffs. */
export const structuredViewerStaticCss = `
.qk-json-viewer, .qk-diff-viewer { min-width: 0; overflow: hidden; border: 1px solid var(--qk-color-border-subtle); border-radius: var(--qk-radius-group); background: var(--qk-color-surface-page); color: var(--qk-color-text-primary); }
.qk-json-viewer__toolbar, .qk-diff-viewer__toolbar { display: flex; min-height: 2.5rem; align-items: center; gap: .5rem; padding: .25rem .5rem .25rem .75rem; }
.qk-json-viewer__copy, .qk-diff-viewer__copy { margin-inline-start: auto; }
.qk-json-viewer__fallback, .qk-diff-viewer__fallback, .qk-diff-viewer__totals { font-size: var(--qk-type-helper-font-size); color: var(--qk-color-text-tertiary); }
.qk-diff-viewer__totals { margin-inline-start: auto; font-variant-numeric: tabular-nums; }
.qk-diff-viewer__totals + .qk-diff-viewer__copy { margin-inline-start: 0; }
.qk-json-viewer__tree, .qk-diff-viewer__content { overflow: auto; border-top: 1px solid var(--qk-color-border-subtle); font-family: var(--qk-type-code-font-family); font-size: var(--qk-type-compact-font-size); line-height: 1.7; outline: none; }
.qk-json-viewer__tree:focus-visible, .qk-diff-viewer__content:focus-visible { outline: 2px solid var(--qk-color-action-text); outline-offset: -2px; }
.qk-json-viewer__tree { padding-block: .375rem; }
.qk-json-viewer__summary, .qk-json-viewer__scalar, .qk-json-viewer__close, .qk-json-viewer__limit, .qk-json-viewer__more { min-height: 1.6rem; padding-inline-start: calc(.75rem + var(--qk-json-depth, 0) * 1.1rem); padding-inline-end: .75rem; }
.qk-json-viewer__summary { display: flex; align-items: baseline; gap: .375rem; cursor: pointer; list-style: none; }
.qk-json-viewer__summary::-webkit-details-marker { display: none; }
.qk-json-viewer__summary::before { content: '›'; display: inline-block; width: .75rem; flex: none; color: var(--qk-color-text-tertiary); transform: rotate(0deg); transition: transform .15s ease; }
.qk-json-viewer__branch[open] > .qk-json-viewer__summary::before { transform: rotate(90deg); }
.qk-json-viewer__summary:hover, .qk-json-viewer__summary:focus-visible, .qk-json-viewer__more:hover, .qk-json-viewer__more:focus-visible { color: var(--qk-color-action-text); }
.qk-json-viewer__summary:focus-visible, .qk-json-viewer__more:focus-visible, .qk-diff-viewer__hunk-toggle:focus-visible, .qk-diff-viewer__reveal:focus-visible, .qk-json-viewer__expand-source:focus-visible, .qk-diff-viewer__expand-source:focus-visible { outline: 2px solid var(--qk-color-action-text); outline-offset: -2px; }
.qk-json-viewer__scalar { display: flex; align-items: baseline; gap: .375rem; padding-inline-start: calc(1.5rem + var(--qk-json-depth, 0) * 1.1rem); }
.qk-json-viewer__key { color: var(--qk-color-text-secondary); white-space: nowrap; }
.qk-json-viewer__value { overflow-wrap: anywhere; white-space: pre-wrap; }
.qk-json-viewer__value[data-kind="string"] { color: var(--qk-color-success-text); }
.qk-json-viewer__value[data-kind="number"], .qk-json-viewer__value[data-kind="boolean"] { color: var(--qk-color-action-text); }
.qk-json-viewer__value[data-kind="null"], .qk-json-viewer__count, .qk-json-viewer__punctuation, .qk-json-viewer__close, .qk-json-viewer__limit { color: var(--qk-color-text-tertiary); }
.qk-json-viewer__count { font-family: var(--qk-type-body-font-family); font-size: var(--qk-type-helper-font-size); }
.qk-json-viewer__more, .qk-json-viewer__expand-source, .qk-diff-viewer__expand-source { border: 0; background: transparent; color: var(--qk-color-text-secondary); font: inherit; cursor: pointer; }
.qk-json-viewer__scalar > .qk-json-viewer__more { flex: none; padding: 0; color: var(--qk-color-action-text); }
.qk-json-viewer__source, .qk-diff-viewer__source { border-top: 1px solid var(--qk-color-border-subtle); }
.qk-json-viewer__source .qk-code-block, .qk-diff-viewer__source .qk-code-block { border: 0; border-radius: 0; }
.qk-json-viewer__expand-source, .qk-diff-viewer__expand-source { padding: .25rem .75rem .625rem; color: var(--qk-color-action-text); font-size: var(--qk-type-helper-font-size); }
.qk-diff-viewer__metadata { padding: .375rem .75rem; color: var(--qk-color-text-tertiary); white-space: pre; }
.qk-diff-viewer__hunk { min-width: max-content; }
.qk-diff-viewer__hunk-toggle { display: flex; width: 100%; min-height: 1.8rem; align-items: center; gap: .5rem; border: 0; border-top: 1px solid var(--qk-color-border-subtle); padding: .15rem .75rem; background: transparent; color: var(--qk-color-text-secondary); font: inherit; text-align: start; cursor: pointer; }
.qk-diff-viewer__hunk-toggle:hover { color: var(--qk-color-action-text); }
.qk-diff-viewer__chevron { width: .75rem; font-family: var(--qk-type-body-font-family); font-size: 1rem; }
.qk-diff-viewer__hunk-header { white-space: pre; }
.qk-diff-viewer__hunk-count { margin-inline-start: auto; color: var(--qk-color-text-tertiary); font-family: var(--qk-type-body-font-family); font-size: var(--qk-type-helper-font-size); }
.qk-diff-viewer__line { display: grid; grid-template-columns: calc(var(--qk-diff-number-digits, 3) * 1ch + 1rem) calc(var(--qk-diff-number-digits, 3) * 1ch + 1rem) 2ch minmax(max-content, 1fr); min-height: 1.5rem; align-items: baseline; white-space: pre; }
.qk-diff-viewer__number { align-self: stretch; color: var(--qk-color-text-tertiary); text-align: end; padding-inline: .5rem; font-variant-numeric: tabular-nums; user-select: none; background: color-mix(in srgb, var(--qk-color-text-tertiary) 12%, transparent); }
.qk-diff-viewer__marker { color: var(--qk-color-text-tertiary); padding-inline-start: .5rem; user-select: none; }
.qk-diff-viewer__text { padding-inline-end: .75rem; }
.qk-diff-viewer__line[data-kind="added"] { background: var(--qk-color-success-surface); }
.qk-diff-viewer__line[data-kind="removed"] { background: var(--qk-color-danger-surface); }
.qk-diff-viewer__line[data-kind="added"] .qk-diff-viewer__marker { color: var(--qk-color-success-text); }
.qk-diff-viewer__line[data-kind="removed"] .qk-diff-viewer__marker { color: var(--qk-color-danger-text); }
.qk-diff-viewer__line[data-kind="note"] { color: var(--qk-color-text-tertiary); }
.qk-diff-viewer__reveal { display: block; width: 100%; border: 0; padding: .25rem .75rem; background: var(--qk-color-surface-subtle); color: var(--qk-color-text-secondary); font: inherit; text-align: start; cursor: pointer; }
.qk-diff-viewer__reveal:hover { color: var(--qk-color-action-text); }
@media (prefers-reduced-motion: reduce) { .qk-json-viewer__summary::before { transition: none; } }
`;
