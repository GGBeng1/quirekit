import { controlSizeShortcuts } from "../control/sizes";
import type { UserShortcuts } from "@unocss/core";

/** 复制内容与触发器的公开 anatomy。 */
export const clipboardRecipeCatalog = Object.freeze([
  ...["xs", "sm", "md", "lg", "xl"].map(size => `qk-clipboard--${size}`),
  "qk-clipboard", "qk-clipboard__label", "qk-clipboard__control", "qk-clipboard__input", "qk-clipboard__text", "qk-clipboard__trigger", "qk-clipboard__labels", "qk-clipboard__error"
]);

/** 复制操作在长文本、键盘焦点和反馈状态下的样式。 */
export const clipboardShortcuts = [
  ...controlSizeShortcuts("qk-clipboard", "content"),
  ["qk-clipboard", "grid min-w-0 gap-qk-inline font-qk-product text-qk-text-primary", { layer: "qk-recipes" }],
  ["qk-clipboard__label", "font-medium text-qk-text-secondary", { layer: "qk-recipes" }],
  ["qk-clipboard__control", "flex min-w-0 items-center gap-qk-inline", { layer: "qk-recipes" }],
  ["qk-clipboard__input", "box-border w-full min-w-0 h-[var(--qk-control-size-height)] flex-1 rounded-qk-control border border-qk-border-default bg-qk-surface-page px-2 [font-size:inherit] [line-height:inherit] text-qk-text-primary [outline:none] focus-visible:border-qk-border-focus", { layer: "qk-recipes" }],
  ["qk-clipboard__text", "min-w-0 flex-1 break-all text-qk-text-secondary", { layer: "qk-recipes" }],
  ["qk-clipboard__error", "min-w-0 text-qk-helper text-qk-danger-foreground", { layer: "qk-recipes" }],
  ["qk-clipboard__labels", "inline-grid [&>span]:[grid-area:1/1] [&>[data-hidden]]:invisible", { layer: "qk-recipes" }],
  ["qk-clipboard__trigger", "box-border inline-flex h-[var(--qk-control-size-height)] shrink-0 items-center justify-center gap-1.5 whitespace-nowrap rounded-qk-control border border-qk-border-default bg-transparent px-2.5 [font-size:inherit] [line-height:inherit] text-qk-text-secondary cursor-pointer hover:bg-qk-surface-hover focus-visible:[outline:none] focus-visible:bg-qk-surface-hover data-[variant=text]:border-transparent data-[copied]:text-qk-success-foreground data-[icon-only]:w-[var(--qk-control-size-height)] data-[icon-only]:p-0 disabled:cursor-not-allowed disabled:text-qk-text-disabled", { layer: "qk-recipes" }]
] satisfies UserShortcuts;
