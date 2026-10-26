import type { StaticShortcut } from '@unocss/core';
import { themeVariableReferences } from '@quirekit/ui';
/** Static content groups use existing semantic roles, without an interaction state machine. */
export const cardShortcuts: StaticShortcut[] = [
  ['qk-card', ['box-border flex min-w-0 max-w-full flex-col rounded-qk-group font-qk-product text-qk-compact leading-qk-compact text-qk-text-primary', {
    padding: 'var(--qk-card-inset)', gap: 'var(--qk-card-inset)', 'overflow-wrap': 'anywhere',
    border: 'var(--qk-border-width-default) solid transparent'
  }], { layer: 'qk-recipes' }],
  ['qk-card--comfortable', [{ '--qk-card-inset': themeVariableReferences.spacing.surface }], { layer: 'qk-recipes' }],
  ['qk-card--compact', [{ '--qk-card-inset': themeVariableReferences.spacing.surfaceCompact }], { layer: 'qk-recipes' }],
  ['qk-card--outline', 'bg-qk-surface-page border-qk-border-subtle', { layer: 'qk-recipes' }],
  ['qk-card--soft', 'bg-qk-surface-subtle', { layer: 'qk-recipes' }],
  ['qk-card--plain', 'bg-transparent', { layer: 'qk-recipes' }],
  ['qk-card--raised', 'bg-qk-surface-raised', { layer: 'qk-recipes' }],
  ['qk-card__section', 'min-w-0 max-w-full', { layer: 'qk-recipes' }],
  ['qk-card__section--divided', [{ 'padding-top': 'var(--qk-card-inset)', 'border-top': 'var(--qk-border-width-default) solid var(--qk-color-border-subtle)' }], { layer: 'qk-recipes' }],
  ['qk-card__header', 'flex flex-wrap items-start gap-qk-surface-compact', { layer: 'qk-recipes' }],
  ['qk-card__copy', ['grid min-w-0 gap-qk-inline-tight', { flex: '1 1 auto' }], { layer: 'qk-recipes' }],
  ['qk-card__title', ['m-0 text-qk-heading leading-qk-heading', { 'font-weight': themeVariableReferences.typography.heading.fontWeight }], { layer: 'qk-recipes' }],
  ['qk-card__description', 'm-0 text-qk-text-secondary', { layer: 'qk-recipes' }],
  ['qk-card__trailing', 'flex min-w-0 max-w-full flex-wrap items-center gap-qk-inline', { layer: 'qk-recipes' }],
  ['qk-card__body', 'min-w-0', { layer: 'qk-recipes' }],
  ['qk-card__footer', 'min-w-0', { layer: 'qk-recipes' }]
];
/** Public anatomy included in both generated CSS and the token atlas. */
export const cardRecipeCatalog = Object.freeze(cardShortcuts.map(shortcut => shortcut[0]));
