import type { UserShortcuts } from "@unocss/core";
import { themeVariableReferences } from "@quirekit/ui";

/** EmptyState 对外发布的中性内容 anatomy。 */
export const emptyStateRecipeCatalog = Object.freeze([
  "qk-empty-state",
  "qk-empty-state--sm",
  "qk-empty-state--md",
  "qk-empty-state__illustration",
  "qk-empty-state__illustration--sm",
  "qk-empty-state__illustration--md",
  "qk-empty-state__illustration--art-sm",
  "qk-empty-state__illustration--art-md",
  "qk-empty-state__art",
  "qk-empty-state__copy",
  "qk-empty-state__title",
  "qk-empty-state__title--sm",
  "qk-empty-state__title--md",
  "qk-empty-state__description",
  "qk-empty-state__description--sm",
  "qk-empty-state__description--md",
  "qk-empty-state__actions"
]);

/** 用既有语义 token 组合空结果的尺寸、排版和动作区域。 */
export const emptyStateShortcuts = [
  ["qk-empty-state", "box-border flex w-full max-w-full min-w-0 flex-col items-center text-center font-qk-product text-qk-text-primary", { layer: "qk-recipes" }],
  ["qk-empty-state--sm", "gap-qk-surface-compact p-qk-surface", { layer: "qk-recipes" }],
  ["qk-empty-state--md", "gap-qk-surface p-qk-group", { layer: "qk-recipes" }],
  ["qk-empty-state__illustration", "grid max-w-full shrink-0 place-items-center text-qk-icon-secondary", { layer: "qk-recipes" }],
  ["qk-empty-state__illustration--sm", "size-[var(--qk-space-section)]", { layer: "qk-recipes" }],
  ["qk-empty-state__illustration--md", "size-[var(--qk-space-major)]", { layer: "qk-recipes" }],
  ["qk-empty-state__illustration--art-sm", "w-[calc(var(--qk-space-group)*4)] aspect-[20/13]", { layer: "qk-recipes" }],
  ["qk-empty-state__illustration--art-md", "w-[calc(var(--qk-space-group)*6)] aspect-[20/13]", { layer: "qk-recipes" }],
  ["qk-empty-state__art", "block size-full", { layer: "qk-recipes" }],
  ["qk-empty-state__copy", "grid w-full max-w-sm min-w-0 gap-qk-inline", { layer: "qk-recipes" }],
  ["qk-empty-state__title", ["m-0 min-w-0 break-words text-qk-text-secondary", {
    "font-weight": themeVariableReferences.typography.control.fontWeight
  }], { layer: "qk-recipes" }],
  ["qk-empty-state__title--sm", "text-qk-compact leading-qk-compact", { layer: "qk-recipes" }],
  ["qk-empty-state__title--md", "text-qk-body leading-qk-body", { layer: "qk-recipes" }],
  ["qk-empty-state__description", ["m-0 min-w-0 break-words text-qk-text-muted", {
    "font-weight": themeVariableReferences.typography.body.fontWeight
  }], { layer: "qk-recipes" }],
  ["qk-empty-state__description--sm", "text-qk-helper leading-qk-helper", { layer: "qk-recipes" }],
  ["qk-empty-state__description--md", "text-qk-compact leading-qk-compact", { layer: "qk-recipes" }],
  ["qk-empty-state__actions", "flex max-w-full min-w-0 flex-wrap items-center justify-center gap-qk-inline", { layer: "qk-recipes" }]
] satisfies UserShortcuts;
