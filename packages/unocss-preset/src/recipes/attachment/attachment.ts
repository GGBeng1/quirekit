import type { StaticShortcut } from '@unocss/core';

/** Resource presentation stays generic; all color roles come from the active theme. */
export const attachmentShortcuts: StaticShortcut[] = [
  ['qk-attachments', 'min-w-0 max-w-full [outline:none] rounded-qk-control focus-visible:bg-qk-surface-hover', { layer: 'qk-recipes' }],
  ['qk-attachment', 'grid min-w-0 max-w-full items-center gap-2 p-2 rounded-qk-control border border-solid border-qk-border-subtle bg-qk-surface-page text-qk-text-primary', { layer: 'qk-recipes' }],
  ['qk-attachment__preview', 'flex items-center justify-center overflow-hidden text-qk-text-muted bg-qk-surface-subtle rounded-qk-control', { layer: 'qk-recipes' }],
  ['qk-attachment__content', 'flex min-w-0 flex-col justify-center gap-0.5', { layer: 'qk-recipes' }],
  ['qk-attachment__name', 'block min-w-0 truncate text-qk-body leading-qk-body', { layer: 'qk-recipes' }],
  ['qk-attachment__meta', 'truncate text-qk-helper leading-qk-helper text-qk-text-tertiary', { layer: 'qk-recipes' }],
  ['qk-attachment__status', 'truncate text-qk-helper leading-qk-helper text-qk-text-secondary data-[state=failed]:text-qk-danger-text', { layer: 'qk-recipes' }],
  ['qk-attachment__actions', 'flex flex-wrap items-center justify-end gap-0.5', { layer: 'qk-recipes' }],
  ['qk-attachment__action', '[--qk-button-neutral-foreground:var(--qk-color-text-muted)] [--qk-button-xs-icon-size:14px]', { layer: 'qk-recipes' }],
  ['qk-attachment__action-icon', '[&.qk-icon]:w-full [&.qk-icon]:h-full', { layer: 'qk-recipes' }],
  ['qk-attachment__progress', 'min-w-0', { layer: 'qk-recipes' }]
];

/** Intrinsic tracks preserve names, hit targets and preview geometry in all three densities. */
export const attachmentStaticCss = `
.qk-attachments__items { display: grid; align-items: start; gap: 8px; }
.qk-attachments[data-layout="inline"] .qk-attachments__items { display: flex; flex-wrap: wrap; }
.qk-attachments[data-layout="grid"] .qk-attachments__items { grid-template-columns: repeat(auto-fill,minmax(min(100%,10rem),1fr)); }
.qk-attachment { --qk-attachment-preview-size: 40px; grid-template-columns: var(--qk-attachment-preview-size) minmax(0,1fr) auto; grid-template-areas: "preview content actions"; }
.qk-attachment:has(.qk-attachment__progress) { grid-template-areas: "preview content actions" "progress progress progress"; }
.qk-attachment:not(:has(.qk-attachment__progress)) { row-gap: 0; }
.qk-attachment__preview { grid-area: preview; width: var(--qk-attachment-preview-size); height: var(--qk-attachment-preview-size); }
.qk-attachment__content { grid-area: content; }
.qk-attachment__actions { grid-area: actions; max-width: 104px; }
.qk-attachment__progress { grid-area: progress; }
.qk-attachment[data-layout="inline"] { --qk-attachment-preview-size: 24px; width: fit-content; padding: 4px 6px; gap: 6px; }
.qk-attachment[data-layout="inline"] .qk-attachment__preview { background: none; }
.qk-attachment[data-layout="inline"] .qk-attachment__content { max-width: 16rem; }
.qk-attachment[data-layout="grid"] { grid-template-columns: minmax(0,1fr) auto; grid-template-areas: "preview preview" "content actions"; row-gap: 8px; }
.qk-attachment[data-layout="grid"]:has(.qk-attachment__progress) { grid-template-areas: "preview preview" "content actions" "progress progress"; }
.qk-attachment[data-layout="grid"] .qk-attachment__preview { width: 100%; height: 112px; }
.qk-attachment[data-media="file"] .qk-attachment__preview { background: transparent; }
.qk-attachment[data-layout="grid"][data-media="file"] { grid-template-columns: 40px minmax(0,1fr) auto; grid-template-areas: "preview content actions"; min-height: 64px; row-gap: 0; }
.qk-attachment[data-layout="grid"][data-media="file"]:has(.qk-attachment__progress) { grid-template-areas: "preview content actions" "progress progress progress"; row-gap: 8px; }
.qk-attachment[data-layout="grid"][data-media="file"] .qk-attachment__preview { width: 40px; height: 40px; }
.qk-attachments[data-layout="strip"] .qk-attachments__items { display: flex; align-items: center; width: max-content; gap: 8px; }
.qk-attachment[data-layout="strip"] { position: relative; flex: none; width: 220px; height: 64px; padding: 8px; grid-template-areas: "preview content actions"; border-radius: var(--qk-radius-group); background: var(--qk-color-surface-raised); box-shadow: 0 1px 2px rgb(0 0 0 / 3%); }
.qk-attachment[data-layout="strip"] .qk-attachment__name { font-size: var(--qk-type-compact-font-size); line-height: var(--qk-type-compact-line-height); }
.qk-attachment[data-layout="strip"] .qk-attachment__progress { position: absolute; inset-inline: 8px; bottom: 3px; }
.qk-attachment[data-layout="strip"][data-media="image"] { --qk-attachment-preview-size: 64px; width: var(--qk-attachment-preview-size); height: var(--qk-attachment-preview-size); padding: 0; display: block; border: 0; }
.qk-attachment[data-layout="strip"][data-media="image"] .qk-attachment__preview { width: var(--qk-attachment-preview-size); height: var(--qk-attachment-preview-size); border-radius: var(--qk-radius-group); }
.qk-attachment[data-layout="strip"][data-media="image"] .qk-attachment__name,
.qk-attachment[data-layout="strip"][data-media="image"] .qk-attachment__meta { position: absolute; width: 1px; height: 1px; padding: 0; overflow: hidden; clip-path: inset(50%); white-space: nowrap; }
.qk-attachment[data-layout="strip"][data-media="image"] .qk-attachment__actions { position: absolute; top: 3px; inset-inline-end: 3px; max-width: calc(var(--qk-attachment-preview-size) - 6px); }
.qk-attachment__action[data-overlay] { --qk-button-neutral-solid-background: color-mix(in srgb, var(--qk-color-surface-inverse) 72%, transparent); --qk-button-neutral-solid-hover-background: var(--qk-color-surface-inverse); --qk-button-neutral-solid-pressed-background: var(--qk-color-surface-inverse); --qk-button-neutral-solid-foreground: var(--qk-color-text-inverse); }
.qk-attachment[data-layout="strip"][data-media="image"] .qk-attachment__status { position: absolute; inset-inline: 3px; bottom: 3px; background: var(--qk-color-surface-page); border-radius: var(--qk-radius-control); padding: 2px; }
.qk-attachment[data-layout="strip"][data-media="image"] .qk-attachment__progress { position: absolute; inset-inline: 3px; bottom: 0; }
.qk-attachment__action:is(:hover,:focus-visible) { --qk-button-neutral-foreground: var(--qk-color-text-primary); }
@media (hover: hover) and (pointer: fine) {
  .qk-attachment[data-state="ready"] .qk-attachment__action[data-action="remove"] { opacity: 0; pointer-events: none; }
  .qk-attachment[data-state="ready"]:is(:hover,:focus-within) .qk-attachment__action[data-action="remove"] { opacity: 1; pointer-events: auto; }
}
@media (pointer: coarse) {
  .qk-attachment[data-layout="strip"][data-media="image"] { --qk-attachment-preview-size: 96px; }
  .qk-attachment:is([data-layout="inline"],[data-layout="list"]) { --qk-attachment-preview-size: 44px; }
  .qk-attachment__action.qk-button { min-width: 44px; min-height: 44px; }
  .qk-attachment__actions { max-width: 92px; }
  .qk-attachment__action[data-overlay] { position: relative; isolation: isolate; --qk-button-neutral-solid-background: transparent; --qk-button-neutral-solid-hover-background: transparent; --qk-button-neutral-solid-pressed-background: transparent; }
  .qk-attachment__action[data-overlay]::before { content: ""; position: absolute; width: 24px; height: 24px; border-radius: 50%; background: color-mix(in srgb, var(--qk-color-surface-inverse) 72%, transparent); pointer-events: none; z-index: -1; }
}
`;

/** Public recipe discovery for runtime, standalone CSS and the design atlas. */
export const attachmentRecipeCatalog = Object.freeze(attachmentShortcuts.map(shortcut => shortcut[0]));
