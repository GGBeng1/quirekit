/** User decisions are a calm single surface, without nested cards or full-width hover bars. */
export const decisionStaticCss = `
.qk-chat-decision { display: grid; min-width: 0; gap: .75rem; padding: .875rem 1rem; border-radius: var(--qk-radius-group); background: var(--qk-color-surface-subtle); color: var(--qk-color-text-primary); font-family: var(--qk-type-body-font-family); }
.qk-chat-decision__heading { display: flex; min-width: 0; align-items: baseline; justify-content: space-between; gap: .5rem 1rem; flex-wrap: wrap; }
.qk-chat-decision__title { min-width: 0; font-weight: var(--qk-type-heading-font-weight); line-height: 1.5; }
.qk-chat-decision__state { flex: none; color: var(--qk-color-text-tertiary); font-size: var(--qk-type-helper-font-size); }
.qk-chat-decision__state[data-state="approved"], .qk-chat-decision__state[data-state="answered"] { color: var(--qk-color-success-text); }
.qk-chat-decision__state[data-state="failed"] { color: var(--qk-color-danger-text); }
.qk-chat-decision__description, .qk-chat-question__description { margin: 0; color: var(--qk-color-text-secondary); font-size: var(--qk-type-compact-font-size); line-height: 1.55; overflow-wrap: anywhere; }
.qk-chat-decision__error, .qk-chat-question__required { margin: 0; color: var(--qk-color-danger-text); font-size: var(--qk-type-helper-font-size); }
.qk-chat-decision__actions { display: flex; align-items: center; gap: .375rem; flex-wrap: wrap; }
.qk-chat-question__items { display: grid; gap: 1rem; min-width: 0; }
.qk-chat-question__summary { display: grid; gap: .375rem; min-width: 0; margin: 0; }
.qk-chat-question__answer { display: flex; align-items: baseline; flex-wrap: wrap; gap: .125rem .75rem; min-width: 0; font-size: var(--qk-type-compact-font-size); line-height: 1.55; }
.qk-chat-question__answer-label { margin: 0; color: var(--qk-color-text-secondary); }
.qk-chat-question__answer-value { margin: 0; color: var(--qk-color-text-primary); font-weight: 500; overflow-wrap: anywhere; }
.qk-chat-question--prompt { display: grid; min-width: 0; justify-items: start; gap: .375rem; color: var(--qk-color-text-primary); font-family: var(--qk-type-body-font-family); }
.qk-chat-question--prompt .qk-chat-decision__title { font-size: var(--qk-type-compact-font-size); font-weight: 600; }
.qk-chat-question__prompt-actions { display: flex; align-items: center; min-width: 0; }
.qk-chat-question__item { display: grid; min-width: 0; gap: .375rem; }
.qk-chat-question__number { margin: 0; color: var(--qk-color-text-tertiary); font-size: var(--qk-type-helper-font-size); font-variant-numeric: tabular-nums; }
.qk-chat-question__text-field { display: grid; min-width: 0; gap: .375rem; }
.qk-chat-question__custom-field { display: grid; min-width: 0; width: min(100%, 34rem); padding-inline-start: 1.5rem; }
.qk-chat-question__label { font-size: var(--qk-type-compact-font-size); font-weight: 600; }
.qk-chat-question .qk-radio-group, .qk-chat-question .qk-checkbox-group { min-width: 0; }
.qk-chat-question .qk-radio-group__label, .qk-chat-question .qk-checkbox-group__label { font-size: var(--qk-type-compact-font-size); font-weight: 600; }
@media (max-width: 420px) { .qk-chat-decision { padding: .75rem; } }
`;
