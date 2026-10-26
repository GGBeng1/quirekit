import type { UserShortcuts } from "@unocss/core";

/** 就地编辑公开 anatomy。 */
export const editableRecipeCatalog = Object.freeze([
  "qk-editable", "qk-editable__label", "qk-editable__row", "qk-editable__area",
  "qk-editable__preview", "qk-editable__input", "qk-editable__controls", "qk-editable__action", "qk-editable__message"
]);

/** 就地编辑预览、输入与明确提交操作的样式。 */
export const editableShortcuts = [
  ["qk-editable", "grid min-w-0 gap-qk-inline text-qk-compact leading-qk-compact text-qk-text-primary", { layer: "qk-recipes" }],
  ["qk-editable__label", "text-qk-text-secondary font-medium data-[hidden]:sr-only", { layer: "qk-recipes" }],
  ["qk-editable__row", "flex min-w-0 items-start gap-qk-inline", { layer: "qk-recipes" }],
  ["qk-editable__area", "min-w-0 max-w-full flex-1 data-[autoresize]:flex-initial", { layer: "qk-recipes" }],
  ["qk-editable__preview", "block box-border min-w-0 h-8 overflow-hidden whitespace-nowrap text-ellipsis [&[hidden]]:hidden rounded-qk-control border border-transparent px-2 py-1.5 cursor-text hover:bg-qk-surface-hover focus-visible:[outline:none] focus-visible:bg-qk-surface-hover data-[disabled]:cursor-not-allowed data-[disabled]:text-qk-text-disabled data-[readonly]:cursor-default [&[data-placeholder-shown]:not([data-disabled])]:text-qk-text-placeholder", { layer: "qk-recipes" }],
  ["qk-editable__input", "box-border min-w-0 w-full h-8 rounded-qk-control border border-qk-border-focus bg-qk-surface-page px-2 text-inherit text-qk-text-primary placeholder:text-qk-text-placeholder placeholder:opacity-100 disabled:placeholder:text-qk-text-disabled disabled:text-qk-text-disabled [outline:none] data-[invalid]:border-qk-danger-border", { layer: "qk-recipes" }],
  ["qk-editable__controls", "flex shrink-0 items-center justify-end gap-1 data-[default]:min-w-17", { layer: "qk-recipes" }],
  ["qk-editable__action", "grid size-8 shrink-0 place-items-center rounded-qk-control border-0 bg-transparent p-0 text-qk-icon-secondary cursor-pointer hover:bg-qk-surface-hover hover:text-qk-icon-primary focus-visible:[outline:none] focus-visible:bg-qk-surface-hover disabled:cursor-not-allowed disabled:text-qk-icon-disabled", { layer: "qk-recipes" }],
  ["qk-editable__message", "m-0 text-qk-helper leading-qk-helper text-qk-text-tertiary data-[invalid]:text-qk-danger-foreground", { layer: "qk-recipes" }]
] satisfies UserShortcuts;
