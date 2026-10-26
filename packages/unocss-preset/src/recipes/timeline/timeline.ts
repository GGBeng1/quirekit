import type { StaticShortcut } from '@unocss/core';

/** Static sequence anatomy; surrounding containers own external padding. */
export const timelineShortcuts: StaticShortcut[] = [
  ['qk-timeline', 'min-w-0 w-full font-qk-product text-qk-body leading-qk-body text-qk-text-primary', { layer: 'qk-recipes' }],
  ['qk-timeline__list', 'm-0 p-0 min-w-0 list-none', { layer: 'qk-recipes' }],
  ['qk-timeline__item', 'relative grid min-w-0 gap-x-qk-surface-compact', { layer: 'qk-recipes' }],
  ['qk-timeline__rail', 'flex min-w-0 flex-col items-center', { layer: 'qk-recipes' }],
  ['qk-timeline__indicator', 'flex shrink-0 items-center justify-center text-qk-text-secondary', { layer: 'qk-recipes' }],
  ['qk-timeline__dot', 'block size-2 text-qk-icon-secondary', { layer: 'qk-recipes' }],
  ['qk-timeline__connector', 'block flex-1 bg-qk-border-subtle', { layer: 'qk-recipes' }],
  ['qk-timeline__body', 'min-w-0', { layer: 'qk-recipes' }],
  ['qk-timeline__heading', 'flex min-w-0 flex-wrap items-baseline gap-x-qk-inline gap-y-qk-inline-tight', { layer: 'qk-recipes' }],
  ['qk-timeline__title', 'min-w-0 font-medium', { layer: 'qk-recipes' }],
  ['qk-timeline__status', 'text-qk-helper leading-qk-helper text-qk-text-secondary', { layer: 'qk-recipes' }],
  ['qk-timeline__time', 'min-w-0 text-qk-helper leading-qk-helper text-qk-text-secondary tabular-nums', { layer: 'qk-recipes' }],
  ['qk-timeline__description', 'mt-qk-inline-tight text-qk-text-secondary', { layer: 'qk-recipes' }],
  ['qk-timeline__content', 'mt-qk-inline min-w-0', { layer: 'qk-recipes' }],
  ['qk-timeline__empty', 'text-qk-text-secondary', { layer: 'qk-recipes' }]
];

/** Public selectors included in standalone CSS and recipe discovery. */
export const timelineRecipeCatalog = Object.freeze(timelineShortcuts.map(shortcut => shortcut[0]));

/** Logical grid placement keeps DOM chronology; marker sizes preserve equal clearance at both connector ends. */
export const timelineStaticCss = `
.qk-timeline { container: qk-timeline / inline-size; --qk-timeline-gap: var(--qk-space-group); }
.qk-timeline__item { --qk-timeline-marker-size: 16px; --qk-timeline-next-marker-size: 16px; grid-template-columns: var(--qk-control-compact) minmax(0, 1fr); grid-template-rows: auto 1fr; }
.qk-timeline__item[data-indicator="dot"] { --qk-timeline-marker-size: 8px; }
.qk-timeline__item[data-indicator="custom"] { --qk-timeline-marker-size: var(--qk-control-compact); }
.qk-timeline__item:has(+ .qk-timeline__item[data-indicator="dot"]) { --qk-timeline-next-marker-size: 8px; }
.qk-timeline__item:has(+ .qk-timeline__item[data-indicator="custom"]) { --qk-timeline-next-marker-size: var(--qk-control-compact); }
.qk-timeline__rail { grid-column: 1; grid-row: 1 / 3; }
.qk-timeline__indicator { inline-size: var(--qk-control-compact); block-size: var(--qk-control-compact); }
.qk-timeline__connector { inline-size: var(--qk-border-width-default); margin-block-start: calc((var(--qk-timeline-marker-size) - var(--qk-control-compact)) / 2 + var(--qk-space-inline-tight)); margin-block-end: calc((var(--qk-timeline-next-marker-size) - var(--qk-control-compact)) / 2 + var(--qk-space-inline-tight)); }
.qk-timeline__time { grid-column: 2; grid-row: 1; padding-block: calc((var(--qk-control-compact) - 1lh) / 2); }
.qk-timeline__body { grid-column: 2; grid-row: 2; padding-block-end: var(--qk-timeline-gap); }
.qk-timeline__item:not([data-has-time]) > .qk-timeline__body { grid-row: 1 / 3; padding-block-start: calc((var(--qk-control-compact) - 1lh) / 2); }
.qk-timeline__item:last-child > .qk-timeline__body { padding-block-end: 0; }
.qk-timeline__item:last-child .qk-timeline__connector { display: none; }
.qk-timeline__body, .qk-timeline__time { overflow-wrap: anywhere; }
.qk-timeline__content:empty { display: none; }
.qk-timeline[data-density="compact"] { --qk-timeline-gap: var(--qk-space-surface-compact); font-size: var(--qk-type-compact-font-size); line-height: var(--qk-type-compact-line-height); }
${['info', 'success', 'warning', 'danger'].map(status => `.qk-timeline__item[data-status="${status}"] .qk-timeline__indicator, .qk-timeline__item[data-status="${status}"] .qk-timeline__status { color: var(--qk-color-${status}-text); }`).join('\n')}
@container qk-timeline (min-width: 32rem) {
  .qk-timeline[data-time-position="aside"] > .qk-timeline__list > .qk-timeline__item { grid-template-columns: minmax(0, min(var(--qk-timeline-time-width), 30%)) var(--qk-control-compact) minmax(0, 1fr); grid-template-rows: auto; }
  .qk-timeline[data-time-position="aside"] > .qk-timeline__list > .qk-timeline__item > .qk-timeline__time { grid-column: 1; grid-row: 1; text-align: end; }
  .qk-timeline[data-time-position="aside"] > .qk-timeline__list > .qk-timeline__item > .qk-timeline__rail { grid-column: 2; grid-row: 1; }
  .qk-timeline[data-time-position="aside"] > .qk-timeline__list > .qk-timeline__item > .qk-timeline__body { grid-column: 3; grid-row: 1; padding-block-start: calc((var(--qk-control-compact) - 1lh) / 2); }
}
`;
