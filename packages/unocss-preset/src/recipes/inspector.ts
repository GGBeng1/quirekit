import type { UserShortcuts } from "@unocss/core";

/** UnoCSS preset 发布的 Inspector anatomy 类。 */
export const inspectorRecipeCatalog = Object.freeze([
  "qk-inspector",
  "qk-inspector--sm",
  "qk-inspector--md",
  "qk-inspector--embedded",
  "qk-inspector--disabled",
  "qk-inspector__header",
  "qk-inspector__heading",
  "qk-inspector__title",
  "qk-inspector__description",
  "qk-inspector__actions",
  "qk-inspector__status",
  "qk-inspector__status--mixed",
  "qk-inspector__status--busy",
  "qk-inspector__status--disabled",
  "qk-inspector__status--error",
  "qk-inspector__busy-indicator",
  "qk-inspector__body",
  "qk-inspector__footer",
  "qk-inspector__section",
  "qk-inspector__section-header",
  "qk-inspector__section-heading",
  "qk-inspector__section-title",
  "qk-inspector__section-status",
  "qk-inspector__section-actions",
  "qk-inspector__section-description",
  "qk-inspector__section-body"
]);

/** Inspector 的 retained surface、状态通道和 section shortcuts。 */
export const inspectorShortcuts = [
  ["qk-inspector", "[--qk-inspector-padding:16px] [--qk-inspector-section-padding:16px] relative grid max-h-full min-h-0 min-w-0 max-w-full shrink-0 grid-rows-[auto_auto_minmax(0,1fr)_auto] overflow-clip border-0 border-solid border-l border-qk-border-subtle bg-qk-surface-page text-qk-text-primary", { layer: "qk-recipes" }],
  ["qk-inspector--sm", "[--qk-inspector-padding:12px] [--qk-inspector-section-padding:12px]", { layer: "qk-recipes" }],
  ["qk-inspector--md", "[--qk-inspector-padding:16px] [--qk-inspector-section-padding:16px]", { layer: "qk-recipes" }],
  ["qk-inspector--embedded", "[&.qk-inspector]:border-0 [&.qk-inspector]:bg-transparent", { layer: "qk-recipes" }],
  ["qk-inspector--disabled", "", { layer: "qk-recipes" }],
  // Explicit rows keep the body in the flexible track when status/footer are absent.
  ["qk-inspector__header", "row-start-1 flex min-w-0 items-start justify-between gap-3 border-0 border-solid border-b border-qk-border-subtle p-[var(--qk-inspector-padding)]", { layer: "qk-recipes" }],
  ["qk-inspector__heading", "grid min-w-0 flex-1 gap-1 overflow-x-auto pb-0.5", { layer: "qk-recipes" }],
  ["qk-inspector__title", "m-0 truncate text-qk-heading leading-qk-heading font-semibold", { layer: "qk-recipes" }],
  ["qk-inspector__description", "m-0 text-qk-helper leading-qk-helper text-qk-text-tertiary", { layer: "qk-recipes" }],
  ["qk-inspector__actions", "inline-flex shrink-0 items-center gap-1", { layer: "qk-recipes" }],
  ["qk-inspector__status", "row-start-2 mx-[var(--qk-inspector-padding)] mt-3 flex min-w-0 items-center gap-2 rounded-qk-control bg-qk-surface-hover px-3 py-2 text-qk-helper leading-qk-helper text-qk-text-secondary", { layer: "qk-recipes" }],
  ["qk-inspector__status--mixed", "", { layer: "qk-recipes" }],
  ["qk-inspector__status--busy", "", { layer: "qk-recipes" }],
  ["qk-inspector__status--disabled", "text-qk-text-disabled", { layer: "qk-recipes" }],
  ["qk-inspector__status--error", "bg-qk-danger-surface text-qk-danger-foreground", { layer: "qk-recipes" }],
  ["qk-inspector__busy-indicator", "size-3 shrink-0 animate-spin rounded-full border border-qk-border-subtle border-t-qk-border-strong motion-reduce:animate-none", { layer: "qk-recipes" }],
  ["qk-inspector__body", "relative row-start-3 min-h-0 overflow-y-auto px-[var(--qk-inspector-padding)]", { layer: "qk-recipes" }],
  ["qk-inspector__footer", "row-start-4 flex flex-wrap items-center justify-end gap-2 border-0 border-solid border-t border-qk-border-subtle p-[var(--qk-inspector-padding)]", { layer: "qk-recipes" }],
  ["qk-inspector__section", "grid gap-3 border-0 border-solid border-t border-qk-border-subtle py-[var(--qk-inspector-section-padding)] first:border-t-0", { layer: "qk-recipes" }],
  ["qk-inspector__section-header", "flex min-w-0 items-center justify-between gap-2", { layer: "qk-recipes" }],
  ["qk-inspector__section-heading", "inline-flex min-w-0 items-center gap-2", { layer: "qk-recipes" }],
  ["qk-inspector__section-title", "m-0 truncate text-qk-compact leading-qk-compact font-semibold", { layer: "qk-recipes" }],
  ["qk-inspector__section-status", "shrink-0 rounded-qk-control bg-qk-surface-hover px-1.5 py-0.5 text-qk-helper leading-qk-helper text-qk-text-tertiary", { layer: "qk-recipes" }],
  ["qk-inspector__section-actions", "inline-flex shrink-0 items-center gap-1", { layer: "qk-recipes" }],
  ["qk-inspector__section-description", "m-0 text-qk-helper leading-qk-helper text-qk-text-tertiary", { layer: "qk-recipes" }],
  ["qk-inspector__section-body", "grid min-w-0 gap-3", { layer: "qk-recipes" }]
] satisfies UserShortcuts;
