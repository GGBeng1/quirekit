/** Lightweight page chrome, independent of backend surfaces and host stylesheets. */
export const PAGE_PLACEHOLDER_STYLES = `
.qk-page-placeholders { position: absolute; inset: 0; pointer-events: none; z-index: 0; }
.qk-page-placeholder {
  position: absolute; box-sizing: border-box;
  background: var(--qk-color-surface-page, white);
  color: var(--qk-color-text-muted, #788293);
}
.qk-page-placeholder::before {
  content: '';
  position: absolute; z-index: 1; left: calc(50% - 12px); top: calc(50% - 24px);
  width: 24px; height: 24px; box-sizing: border-box; border-radius: 50%;
  border: 2px solid var(--qk-color-border-subtle, #e2e5ec); border-top-color: currentColor;
  animation: qk-page-loading 1s linear infinite;
}
.qk-page-placeholder::after {
  content: 'Loading…'; position: absolute; z-index: 1; top: calc(50% + 12px); left: 0; right: 0;
  text-align: center; font: 12px/1.5 system-ui, sans-serif; transform: translateZ(0);
}
@keyframes qk-page-loading { to { transform: rotate(360deg); } }
.qk-page-placeholder[data-qk-page-ready="true"]::before,
.qk-page-placeholder[data-qk-page-ready="true"]::after { visibility: hidden; }
@media (prefers-reduced-motion: reduce) { .qk-page-placeholder::before { animation: none; } }
`;
