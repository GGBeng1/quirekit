/** Internal overflow geometry shared by attachment collection owners. */
export const horizontalStripStaticCss = `
.qk-horizontal-strip { position: relative; min-width: 0; max-width: 100%; }
.qk-horizontal-strip__viewport, .qk-horizontal-strip__content { min-width: 0; }
.qk-horizontal-strip[data-enabled="true"] > .qk-horizontal-strip__viewport { overflow-x: auto; overscroll-behavior-x: contain; scrollbar-width: none; padding-block: 3px; }
.qk-horizontal-strip[data-enabled="true"] > .qk-horizontal-strip__viewport::-webkit-scrollbar { display: none; }
.qk-horizontal-strip[data-enabled="true"] > .qk-horizontal-strip__viewport > .qk-horizontal-strip__content { width: max-content; min-width: 100%; }
.qk-horizontal-strip__previous.qk-button, .qk-horizontal-strip__next.qk-button { position: absolute; top: 50%; transform: translateY(-50%); z-index: 1; background: var(--qk-color-surface-page); box-shadow: 0 2px 8px rgb(0 0 0 / 10%); }
.qk-horizontal-strip__previous { inset-inline-start: 2px; }
.qk-horizontal-strip__next { inset-inline-end: 2px; }
.qk-horizontal-strip__previous:disabled, .qk-horizontal-strip__next:disabled { visibility: hidden; }
@media (pointer: coarse) {
  .qk-horizontal-strip__previous.qk-button, .qk-horizontal-strip__next.qk-button { min-width: 44px; min-height: 44px; isolation: isolate; background: transparent; border-color: transparent; box-shadow: none; --qk-button-neutral-soft-background: transparent; --qk-button-neutral-soft-pressed-background: transparent; }
  .qk-horizontal-strip__previous::before, .qk-horizontal-strip__next::before { content: ""; position: absolute; width: 24px; height: 24px; border-radius: 50%; background: var(--qk-color-surface-page); border: 1px solid var(--qk-color-border-subtle); box-shadow: 0 2px 8px rgb(0 0 0 / 10%); pointer-events: none; z-index: -1; }
}
`;
