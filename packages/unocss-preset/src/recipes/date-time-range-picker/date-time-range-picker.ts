import type { StaticShortcut } from '@unocss/core';
import { timeRangePickerShortcuts } from '../time-range-picker/time-range-picker';
/** Civil ranges reuse wrapping endpoints, shared control sizes and bounded editing tabs. */
export const dateTimeRangePickerShortcuts: StaticShortcut[] = [...timeRangePickerShortcuts.map<StaticShortcut>(([name, value, meta]) => [name.replace('qk-time-range-picker', 'qk-date-time-range-picker'), value, meta ?? { layer: 'qk-recipes' }]),
  ['qk-date-time-range-picker__editor', ['grid min-h-0 gap-qk-surface-compact', { 'grid-template-rows': 'auto minmax(0, 1fr)' }], { layer: 'qk-recipes' }],
  ['qk-date-time-range-picker__active-endpoint', 'relative [&[data-active-endpoint]]:after:content-[\"\"] [&[data-active-endpoint]]:after:absolute [&[data-active-endpoint]]:after:bottom-0 [&[data-active-endpoint]]:after:inset-x-0 [&[data-active-endpoint]]:after:h-0.5 [&[data-active-endpoint]]:after:bg-qk-action-primary', { layer: 'qk-recipes' }],
  ['qk-date-time-range-picker__endpoint-row', ['inline-flex items-center gap-qk-inline', { flex: '1 1 auto', 'min-width': 'max-content' }], { layer: 'qk-recipes' }]
];
/** Static CSS and the token atlas consume the same recipe inventory. */
export const dateTimeRangePickerRecipeCatalog = Object.freeze(dateTimeRangePickerShortcuts.map(shortcut => shortcut[0]));
