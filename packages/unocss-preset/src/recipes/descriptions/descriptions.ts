import type { StaticShortcut } from '@unocss/core';

/** Native name–value anatomy; the parent container owns external padding. */
export const descriptionsShortcuts: StaticShortcut[] = [
  ['qk-descriptions', 'min-w-0 w-full text-qk-body leading-qk-body text-qk-text-primary', { layer: 'qk-recipes' }],
  ['qk-descriptions__header', 'flex flex-wrap items-center gap-qk-inline mb-qk-surface', { layer: 'qk-recipes' }],
  ['qk-descriptions__title', 'm-0 min-w-0 text-qk-heading leading-qk-heading font-qk-heading', { layer: 'qk-recipes' }],
  ['qk-descriptions__trailing', 'min-w-0 ms-auto', { layer: 'qk-recipes' }],
  ['qk-descriptions__list', 'm-0 grid min-w-0 gap-x-qk-group gap-y-qk-surface', { layer: 'qk-recipes' }],
  ['qk-descriptions__item', 'grid min-w-0 content-start items-baseline gap-x-qk-surface gap-y-qk-inline', { layer: 'qk-recipes' }],
  ['qk-descriptions__label', 'min-w-0 text-qk-text-secondary font-qk-body', { layer: 'qk-recipes' }],
  ['qk-descriptions__value', 'm-0 min-w-0', { layer: 'qk-recipes' }]
];
/** Public recipe selectors used by the preset and standalone stylesheet. */
export const descriptionsRecipeCatalog = Object.freeze(descriptionsShortcuts.map(shortcut => shortcut[0]));

/** Container breakpoints keep narrow sidebars independent of the window width. */
export const descriptionsStaticCss = `
.qk-descriptions { container: qk-descriptions / inline-size; }
.qk-descriptions__list {
  --qk-descriptions-span-1: 1; --qk-descriptions-span-2: 1;
  --qk-descriptions-span-3: 1; --qk-descriptions-span-4: 1;
  grid-template-columns: minmax(0, 1fr);
}
.qk-descriptions__item { grid-template-columns: minmax(0, min(var(--qk-descriptions-label-width), 40%)) minmax(0, 1fr); }
.qk-descriptions__label, .qk-descriptions__value { overflow-wrap: anywhere; }
.qk-descriptions__list[data-orientation="vertical"] > .qk-descriptions__item { grid-template-columns: minmax(0, 1fr); }
.qk-descriptions__list[data-density="compact"] { row-gap: var(--qk-space-surface-compact); font-size: var(--qk-type-compact-font-size); line-height: var(--qk-type-compact-line-height); }
.qk-descriptions__list[data-density="compact"] > .qk-descriptions__item { column-gap: var(--qk-space-surface-compact); }
.qk-descriptions__list[data-variant="divided"] { row-gap: 0; }
.qk-descriptions__list[data-variant="divided"] > .qk-descriptions__item { padding-block: var(--qk-space-surface-compact); border-block-end: var(--qk-border-width-default) solid var(--qk-color-border-subtle); }
.qk-descriptions__list[data-variant="divided"][data-density="compact"] > .qk-descriptions__item { padding-block: var(--qk-space-inline); }
${[2, 3, 4].map(count => `@container qk-descriptions (min-width: ${count * 18}rem) {
  .qk-descriptions__list:is(${Array.from({ length: 5 - count }, (_, index) => `[data-columns="${count + index}"]`).join(', ')}) {
    grid-template-columns: repeat(${count}, minmax(0, 1fr));
    ${[2, 3, 4].map(span => `--qk-descriptions-span-${span}: ${Math.min(span, count)};`).join(' ')}
  }
}`).join('\n')}
`;
