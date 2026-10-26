import type { StaticShortcut } from '@unocss/core';
import { themeVariableReferences } from '@quirekit/ui';
import { typographyDeclarations } from '../../typography/declarations';
/** Shared source surface, copy controls and bounded native scrolling. */
export const codeBlockShortcuts: StaticShortcut[] = [
  ['qk-code-block', ['min-w-0 max-w-full overflow-hidden rounded-qk-group border bg-qk-surface-page text-qk-text-primary', { 'border-color': 'color-mix(in oklab, var(--qk-color-border-subtle) 65%, var(--qk-color-surface-page))' }], { layer: 'qk-recipes' }],
  ['qk-code-block__header', ['flex min-w-0 items-center gap-qk-inline ps-qk-surface pe-qk-inline-tight py-qk-inline-tight border-b font-qk-control text-qk-helper', { 'border-color': 'color-mix(in oklab, var(--qk-color-border-subtle) 65%, var(--qk-color-surface-page))' }], { layer: 'qk-recipes' }],
  ['qk-code-block__filename', 'min-w-0 break-all font-qk-code text-qk-compact text-qk-text-secondary', { layer: 'qk-recipes' }],
  ['qk-code-block__language', 'shrink-0 text-qk-text-muted', { layer: 'qk-recipes' }],
  ['qk-code-block__frame', 'relative min-w-0', { layer: 'qk-recipes' }],
  ['qk-code-block__title', 'flex min-w-0 flex-1 flex-wrap items-center gap-qk-inline', { layer: 'qk-recipes' }],
  ['qk-code-block__navigation', 'min-w-0 overflow-x-auto', { layer: 'qk-recipes' }],
  ['qk-code-block__floating', 'absolute end-1 top-1 z-1 rounded-qk-control bg-qk-surface-page', { layer: 'qk-recipes' }],
  ['qk-code-block__actions', 'ms-auto flex shrink-0 items-center gap-qk-inline', { layer: 'qk-recipes' }],
  ['qk-code-block__toggle', 'inline-flex shrink-0 items-center justify-center cursor-pointer rounded-qk-control border-0 bg-transparent px-qk-inline py-qk-inline text-qk-text-secondary hover:bg-qk-surface-hover hover:text-qk-text-primary [outline:none] focus-visible:bg-qk-surface-hover', { layer: 'qk-recipes' }],
  ['qk-code-block__viewport', ['m-0 overflow-auto py-qk-surface-compact px-qk-surface whitespace-pre [outline:none] focus-visible:bg-qk-surface-hover', { ...typographyDeclarations(themeVariableReferences.typography.code, true), 'font-size': 'var(--qk-type-body-font-size)', 'line-height': '1.7', 'background-color': 'color-mix(in oklab, var(--qk-color-text-primary) 2.5%, var(--qk-color-surface-page))', 'outline-offset': '-2px', 'tab-size': '2' }], { layer: 'qk-recipes' }],
  ['qk-code-block__viewport--wrap', ['whitespace-pre-wrap', { 'overflow-wrap': 'anywhere' }], { layer: 'qk-recipes' }]
];
/** Public selectors included in the preset and standalone CSS. */
export const codeBlockRecipeCatalog = Object.freeze(codeBlockShortcuts.map(shortcut => shortcut[0]));
/** Highlighter markup keeps the source viewport's typography and scheme ownership. */
export const codeBlockStaticCss = `
.qk-code-block__viewport[hidden] { display: none; }
/* Standalone consumers do not have to install a third-party border reset. */
.qk-code-block { border-style: solid; }
.qk-code-block__header { border-style: solid; border-width: 0 0 1px; }
/* Even empty, headerless source must contain the floating icon hit area. */
.qk-code-block__frame:has(> .qk-code-block__floating) > .qk-code-block__viewport { min-height: calc(var(--qk-control-regular) + 2 * var(--qk-space-inline-tight)); }
.qk-code-block[data-variant="outline"] .qk-code-block__header { background: var(--qk-color-surface-subtle); }
.qk-code-block[data-variant="outline"] .qk-code-block__viewport { background: var(--qk-color-surface-page); }
.qk-code-block[data-variant="plain"] { border-color: transparent; background: transparent; }
.qk-code-block[data-variant="plain"] .qk-code-block__viewport { background: transparent; }
.qk-code-block[data-density="compact"] .qk-code-block__viewport { padding: calc(2 * var(--qk-space-inline-tight)) var(--qk-space-surface-compact); font-size: var(--qk-type-compact-font-size); }
.qk-code-block[data-density="compact"] .qk-code-block__header { padding-inline-start: var(--qk-space-surface-compact); }
.qk-code-block[data-variant="soft"] .qk-code-block__floating { background: color-mix(in oklab, var(--qk-color-text-primary) 2.5%, var(--qk-color-surface-page)); }
.qk-code-block__line { display: flex; min-height: 1lh; min-width: max-content; }
.qk-code-block__viewport--wrap .qk-code-block__line { min-width: 0; }
.qk-code-block__line-text { min-width: 0; flex: 1; }
.qk-code-block__number, .qk-code-block__change { flex-shrink: 0; user-select: none; color: var(--qk-color-text-muted); }
.qk-code-block__number { min-width: 3ch; padding-inline-end: 2ch; text-align: end; }
.qk-code-block__change { width: 2ch; }
.qk-code-block__line[data-highlighted] { background: var(--qk-color-action-soft); }
.qk-code-block__line[data-change="added"] { background: var(--qk-color-success-surface); }
.qk-code-block__line[data-change="removed"] { background: var(--qk-color-danger-surface); }
.qk-code-block__line[data-change="added"] .qk-code-block__change { color: var(--qk-color-success-text); }
.qk-code-block__line[data-change="removed"] .qk-code-block__change { color: var(--qk-color-danger-text); }
.qk-code-block__viewport code { font: inherit; color: inherit; background: transparent; padding: 0; border: 0; border-radius: 0; white-space: inherit; }
.qk-code-block__viewport .line { display: block; min-height: 1lh; }
.qk-code-block__viewport .line.highlight { background: var(--qk-color-surface-hover); }
/* Shiki can inject unlayered theme rules; the nearest QuireKit scheme owns token colors. */
.qk-code-block__viewport code.shiki span, .qk-code-block__viewport span[style*="--shiki-"] { color: var(--shiki-light, inherit) !important; font-style: var(--shiki-light-font-style, inherit) !important; font-weight: var(--shiki-light-font-weight, inherit) !important; }
@scope ([data-qk-scheme="dark"]) to ([data-qk-scheme="light"]) {
.qk-code-block__viewport code.shiki span, .qk-code-block__viewport span[style*="--shiki-"] { color: var(--shiki-dark, inherit) !important; font-style: var(--shiki-dark-font-style, inherit) !important; font-weight: var(--shiki-dark-font-weight, inherit) !important; }
}
`;
