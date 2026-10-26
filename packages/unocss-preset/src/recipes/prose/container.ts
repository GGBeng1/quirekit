/** Shared container anatomy for native Prose and editable semantic block adapters. */
export const proseContainerCss = `
.qk-prose-container {
  --qk-prose-container-surface:var(--qk-color-surface-subtle);
  --qk-prose-container-border:var(--qk-color-border-subtle);
  margin-block:var(--qk-prose-block-space, var(--qk-space-surface));
  border:var(--qk-border-width-default) solid var(--qk-prose-container-border);
  border-radius:var(--qk-radius-group);
  background:var(--qk-prose-container-surface);
  color:var(--qk-color-text-primary);
  min-width:0;
}
${["info", "success", "warning", "danger"].map(tone => `.qk-prose-container[data-tone="${tone}"] {
  --qk-prose-container-surface:var(--qk-color-${tone}-surface);
  --qk-prose-container-border:var(--qk-color-${tone}-pressed-surface);
}`).join("\n")}
.qk-prose-container__header {
  display:flex; align-items:center; gap:var(--qk-space-inline);
  padding:var(--qk-space-surface);
  font-family:var(--qk-type-body-font-family);
  font-size:var(--qk-type-body-font-size);
  font-weight:var(--qk-type-heading-font-weight);
  line-height:var(--qk-type-body-line-height);
  overflow-wrap:anywhere;
}
.qk-prose-container__body { display:flow-root; padding:0 var(--qk-space-surface) var(--qk-space-surface); }
.qk-prose-container__body[hidden] { display:none; }
.qk-prose-container__body > :first-child { margin-block-start:0; }
.qk-prose-container__body > :last-child { margin-block-end:0; }
.qk-prose-container:first-child { margin-block-start:0; }
.qk-prose-container:last-child { margin-block-end:0; }
`;
