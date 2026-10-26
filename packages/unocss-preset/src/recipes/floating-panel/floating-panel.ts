import type { StaticShortcut } from '@unocss/core';

/** Every recipe class used by the floating utility card. */
export const floatingPanelRecipeCatalog = Object.freeze(['qk-floating-panel', 'qk-floating-panel__header', 'qk-floating-panel__title'] as const);

/** Non-modal utility card over a product viewport; geometry comes from the component's inline frame. */
export const floatingPanelShortcuts: StaticShortcut[] = [
  ['qk-floating-panel', [{
    position: 'absolute', 'inset-block-start': '0', 'inset-inline-start': '0', 'z-index': 'var(--qk-layer-overlay, 30)',
    'box-sizing': 'border-box', overflow: 'auto', 'pointer-events': 'auto',
    border: '1px solid var(--qk-color-border-subtle)', 'border-radius': 'var(--qk-radius-overlay)',
    color: 'var(--qk-color-text-primary)', background: 'var(--qk-color-surface-raised)', 'box-shadow': 'var(--qk-elevation-overlay)'
  }], { layer: 'qk-recipes' }],
  ['qk-floating-panel__header', [{
    display: 'flex', 'align-items': 'center', 'justify-content': 'space-between',
    padding: 'var(--qk-space-inline) var(--qk-space-inline) 0 var(--qk-space-surface-compact)',
    cursor: 'move', 'user-select': 'none', 'touch-action': 'none'
  }], { layer: 'qk-recipes' }],
  ['qk-floating-panel__title', [{ margin: '0', 'font-size': 'var(--qk-type-body-font-size, 14px)', 'font-weight': '600' }], { layer: 'qk-recipes' }],
];
