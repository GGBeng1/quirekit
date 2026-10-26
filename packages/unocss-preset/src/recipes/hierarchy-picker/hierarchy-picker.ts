import type { StaticShortcut } from '@unocss/core';

/** Hierarchical fields use existing controls; this recipe owns only composition and scroll geometry. */
export const hierarchyPickerShortcuts: StaticShortcut[] = [
  ['qk-hierarchy-picker', 'relative inline-block max-w-full min-w-0 align-middle', { layer: 'qk-recipes' }],
  ['qk-hierarchy-picker__control', 'relative min-w-0', { layer: 'qk-recipes' }],
  ['qk-hierarchy-picker__trigger', 'w-full min-w-0', { layer: 'qk-recipes' }],
  ['qk-hierarchy-picker__value', 'min-w-0 flex-1 truncate text-start', { layer: 'qk-recipes' }],
  ['qk-hierarchy-picker__clear', 'absolute top-1/2 -translate-y-1/2', { layer: 'qk-recipes' }],
  ['qk-hierarchy-picker__search', 'p-qk-surface-compact border-b border-qk-border-subtle', { layer: 'qk-recipes' }],
  ['qk-hierarchy-picker__viewport', 'min-h-0 overflow-auto overscroll-contain p-1', { layer: 'qk-recipes' }],
  ['qk-hierarchy-picker__empty', 'm-0 p-qk-surface text-qk-compact text-qk-text-secondary', { layer: 'qk-recipes' }],
  ['qk-cascader__panels', 'relative min-w-0', { layer: 'qk-recipes' }],
  ['qk-cascader__level', 'min-w-0 overflow-y-auto overscroll-contain p-1', { layer: 'qk-recipes' }],
  ['qk-cascader__flyout', 'absolute box-border overflow-auto overscroll-contain border border-qk-border-subtle', { layer: 'qk-recipes' }],
  ['qk-hierarchy-picker__option', 'min-w-0 flex-1 break-words', { layer: 'qk-recipes' }],
  ['qk-hierarchy-picker__next', 'shrink-0 text-qk-icon-secondary rtl:rotate-180', { layer: 'qk-recipes' }],
  ['qk-tree-view__checkbox', 'flex min-w-0 flex-1 cursor-pointer items-center gap-qk-inline self-stretch outline-none data-[disabled]:cursor-not-allowed', { layer: 'qk-recipes' }],
  ['qk-tree-view__checkmark', 'relative block size-3.5 shrink-0 rounded-qk-control border border-qk-border-default bg-qk-surface-page', { layer: 'qk-recipes' }]
];
/** Selectors included in both preset and standalone output. */
export const hierarchyPickerRecipeCatalog = Object.freeze(hierarchyPickerShortcuts.map(shortcut => shortcut[0]));
/** Popup bounds share the existing positioning engine's available space. */
export const hierarchyPickerStaticCss = `
.qk-hierarchy-picker__clear { inset-inline-end: 1.75rem; }
.qk-hierarchy-picker__control:has(.qk-hierarchy-picker__clear) .qk-hierarchy-picker__value { padding-inline-end: 1.25rem; }
.qk-hierarchy-picker[data-invalid=true] .qk-hierarchy-picker__trigger { border-color: var(--qk-color-danger-border); }
.qk-popover__content.qk-hierarchy-picker__popup { padding: 0; width: max(18rem, var(--reference-width, 18rem)); max-width: min(calc(100vw - 2rem), var(--available-width, 100vw)); overflow: hidden; }
.qk-popover__content.qk-hierarchy-picker__popup--flyouts { overflow: visible; }
.qk-cascader__flyout { width: min(12rem, calc(100vw - 16px)); background: var(--qk-popover-background); color: var(--qk-popover-foreground); border-radius: var(--qk-popover-radius); box-shadow: var(--qk-popover-shadow); }
.qk-cascader__flyout > .qk-cascader__level { max-height: none; overflow: visible; }
.qk-tree-view__checkbox[data-state=checked] .qk-tree-view__checkmark, .qk-tree-view__checkbox[data-state=indeterminate] .qk-tree-view__checkmark { border-color: var(--qk-color-action-primary); background: var(--qk-color-action-primary); color: var(--qk-color-text-inverse); }
.qk-tree-view__checkbox[data-state=checked] .qk-tree-view__checkmark::after { content: ''; position: absolute; width: 3px; height: 6px; border: solid currentColor; border-width: 0 1.5px 1.5px 0; transform: rotate(45deg); top: 1px; left: 4px; }
.qk-tree-view__checkbox[data-state=indeterminate] .qk-tree-view__checkmark::after { content: ''; position: absolute; height: 1.5px; inset-inline: 3px; top: 5px; background: currentColor; }
.qk-tree-view__checkbox[data-disabled] .qk-tree-view__checkmark { opacity: .5; }
`;
