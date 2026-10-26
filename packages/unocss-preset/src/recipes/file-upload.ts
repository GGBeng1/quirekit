import type { UserShortcuts } from "@unocss/core";

/** UnoCSS preset 发布的 FileUpload anatomy 类。 */
export const fileUploadRecipeCatalog = Object.freeze([
  "qk-file-upload",
  "qk-file-upload--invalid",
  "qk-file-upload__label",
  "qk-file-upload__required",
  "qk-file-upload__dropzone",
  "qk-file-upload__dropzone-icon",
  "qk-file-upload__description",
  "qk-file-upload__hint",
  "qk-file-upload__actions",
  "qk-file-upload__trigger",
  "qk-file-upload__clear",
  "qk-file-upload__count",
  "qk-file-upload__collection",
  "qk-file-upload__list",
  "qk-file-upload__item",
  "qk-file-upload__preview",
  "qk-file-upload__preview-image-wrap",
  "qk-file-upload__preview-image",
  "qk-file-upload__item-content",
  "qk-file-upload__item-name",
  "qk-file-upload__item-size",
  "qk-file-upload__delete",
  "qk-file-upload__rejections",
  "qk-file-upload__rejection",
  "qk-file-upload__rejection-icon",
  "qk-file-upload__rejection-message"
]);

/** FileUpload dropzone、文件列表与反馈样式。 */
export const fileUploadShortcuts = [
  ["qk-file-upload", "grid min-w-0 gap-3 text-qk-compact leading-qk-compact text-qk-text-primary", { layer: "qk-recipes" }],
  ["qk-file-upload--invalid", "[&_.qk-file-upload\\_\\_dropzone]:border-qk-danger-border", { layer: "qk-recipes" }],
  ["qk-file-upload__label", "font-medium text-qk-text-primary", { layer: "qk-recipes" }],
  ["qk-file-upload__required", "ms-0.5 text-qk-danger-foreground", { layer: "qk-recipes" }],
  [
    "qk-file-upload__dropzone",
    "grid min-h-40 cursor-pointer place-items-center content-center gap-2 rounded-qk-dialog border border-dashed border-qk-border-default bg-qk-surface-subtle px-6 py-8 text-center [outline:none] transition-colors hover:border-qk-border-strong hover:bg-qk-surface-hover data-[dragging]:border-solid data-[dragging]:border-qk-action-primary data-[dragging]:bg-qk-action-soft [outline:none] data-[focus-visible]:bg-qk-surface-hover data-[disabled]:cursor-not-allowed data-[disabled]:border-qk-border-disabled data-[disabled]:bg-qk-surface-disabled data-[disabled]:text-qk-text-disabled",
    { layer: "qk-recipes" }
  ],
  ["qk-file-upload__dropzone-icon", "grid size-10 place-items-center rounded-full bg-qk-action-soft text-qk-action-text", { layer: "qk-recipes" }],
  ["qk-file-upload__description", "font-medium text-qk-text-primary", { layer: "qk-recipes" }],
  ["qk-file-upload__hint", "text-qk-helper leading-qk-helper text-qk-text-secondary", { layer: "qk-recipes" }],
  ["qk-file-upload__actions", "flex min-w-0 flex-wrap items-center gap-2", { layer: "qk-recipes" }],
  [
    "qk-file-upload__trigger",
    "qk-button qk-button--primary-solid qk-button--sm",
    { layer: "qk-recipes" }
  ],
  ["qk-file-upload__clear", "qk-button qk-button--neutral-ghost qk-button--sm", { layer: "qk-recipes" }],
  ["qk-file-upload__count", "ms-auto text-qk-helper tabular-nums text-qk-text-tertiary", { layer: "qk-recipes" }],
  ["qk-file-upload__collection", "grid min-w-0 gap-qk-inline", { layer: "qk-recipes" }],
  ["qk-file-upload__list", "grid list-none gap-2 p-0", { layer: "qk-recipes" }],
  ["qk-file-upload__item", "flex min-w-0 items-center gap-3 rounded-qk-control border border-qk-border-subtle bg-qk-surface-page p-2.5", { layer: "qk-recipes" }],
  ["qk-file-upload__preview", "relative grid size-10 shrink-0 place-items-center overflow-hidden rounded-qk-control", { layer: "qk-recipes" }],
  ["qk-file-upload__preview-image-wrap", "absolute inset-0 overflow-hidden rounded-[inherit]", { layer: "qk-recipes" }],
  ["qk-file-upload__preview-image", "size-full object-cover", { layer: "qk-recipes" }],
  ["qk-file-upload__item-content", "grid min-w-0 flex-1 gap-0.5", { layer: "qk-recipes" }],
  ["qk-file-upload__item-name", "truncate font-medium text-qk-text-primary", { layer: "qk-recipes" }],
  ["qk-file-upload__item-size", "text-qk-helper tabular-nums text-qk-text-tertiary", { layer: "qk-recipes" }],
  ["qk-file-upload__delete", "shrink-0", { layer: "qk-recipes" }],
  ["qk-file-upload__rejections", "grid list-none gap-2 p-0", { layer: "qk-recipes" }],
  ["qk-file-upload__rejection", "flex min-w-0 items-center gap-3 rounded-qk-control border border-qk-danger-border bg-qk-danger-surface p-2.5", { layer: "qk-recipes" }],
  ["qk-file-upload__rejection-icon", "shrink-0 text-qk-danger-foreground", { layer: "qk-recipes" }],
  ["qk-file-upload__rejection-message", "text-qk-helper leading-qk-helper text-qk-danger-foreground", { layer: "qk-recipes" }]
] satisfies UserShortcuts;

/** Compact attachments preserve previews, names, validation and removal inside a composed field. */
export const fileUploadStaticCss = `
.qk-file-upload__collection[data-layout="compact"] .qk-file-upload__list { display: flex; flex-wrap: wrap; margin: 0; }
.qk-file-upload__collection[data-layout="compact"] .qk-file-upload__item { width: 15rem; max-width: 100%; gap: var(--qk-space-inline); padding: var(--qk-space-inline); }
.qk-file-upload__collection[data-layout="compact"] .qk-file-upload__item-name { font-weight: normal; }
.qk-file-upload__collection[data-layout="compact"] .qk-file-upload__delete { width: var(--qk-control-compact); height: var(--qk-control-compact); color: var(--qk-color-text-muted); border-radius: var(--qk-radius-control); }
.qk-file-upload__collection[data-layout="compact"] .qk-file-upload__rejections { margin: 0; }
.qk-file-upload__collection[data-layout="strip"] .qk-file-upload__list { display: flex; align-items: center; width: max-content; margin: 0; }
.qk-file-upload__collection[data-layout="strip"] .qk-file-upload__item { position: relative; width: 220px; height: 64px; flex: none; padding: 8px; gap: 8px; border-radius: var(--qk-radius-group); background: var(--qk-color-surface-raised); box-shadow: 0 1px 2px rgb(0 0 0 / 3%); }
.qk-file-upload__collection[data-layout="strip"] .qk-file-upload__item-name { font-weight: normal; }
.qk-file-upload__collection[data-layout="strip"] .qk-file-upload__delete { width: 24px; height: 24px; flex: none; min-height: 0; border-radius: var(--qk-radius-control); color: var(--qk-color-text-muted); }
.qk-file-upload__collection[data-layout="strip"] .qk-file-upload__item[data-media="image"] { width: 64px; padding: 0; border: 0; }
.qk-file-upload__collection[data-layout="strip"] [data-media="image"] .qk-file-upload__preview { width: 64px; height: 64px; border-radius: var(--qk-radius-group); }
.qk-file-upload__collection[data-layout="strip"] [data-media="image"] .qk-file-upload__item-content { position: absolute; width: 1px; height: 1px; overflow: hidden; clip-path: inset(50%); white-space: nowrap; }
.qk-file-upload__collection[data-layout="strip"] [data-media="image"] .qk-file-upload__delete { position: absolute; top: 3px; inset-inline-end: 3px; border-radius: var(--qk-radius-pill); color: var(--qk-color-text-inverse); --qk-button-neutral-solid-background: color-mix(in srgb, var(--qk-color-surface-inverse) 72%, transparent); --qk-button-neutral-solid-hover-background: var(--qk-color-surface-inverse); --qk-button-neutral-solid-pressed-background: var(--qk-color-surface-inverse); --qk-button-neutral-solid-foreground: var(--qk-color-text-inverse); }
@media (hover: hover) and (pointer: fine) {
  .qk-file-upload__collection:is([data-layout="strip"],[data-layout="compact"]) .qk-file-upload__item .qk-file-upload__delete { opacity: 0; pointer-events: none; }
  .qk-file-upload__collection:is([data-layout="strip"],[data-layout="compact"]) .qk-file-upload__item:is(:hover,:focus-within) .qk-file-upload__delete { opacity: 1; pointer-events: auto; }
}
@media (pointer: coarse) {
  .qk-file-upload__delete { min-width: 44px; min-height: 44px; }
  .qk-file-upload__collection[data-layout="strip"] [data-media="image"] .qk-file-upload__delete { isolation: isolate; --qk-button-neutral-solid-background: transparent; --qk-button-neutral-solid-hover-background: transparent; --qk-button-neutral-solid-pressed-background: transparent; }
  .qk-file-upload__collection[data-layout="strip"] [data-media="image"] .qk-file-upload__delete::before { content: ""; position: absolute; width: 24px; height: 24px; border-radius: 50%; background: color-mix(in srgb, var(--qk-color-surface-inverse) 72%, transparent); pointer-events: none; z-index: -1; }
}
@media (pointer: coarse) { .qk-file-upload__collection[data-layout="compact"] .qk-file-upload__delete { min-width: 44px; min-height: 44px; } }
`;
