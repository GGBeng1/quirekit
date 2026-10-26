import type { StaticShortcut } from '@unocss/core';

/** File colors are local identities, never success/error states or button accents. */
export const fileIconShortcuts: StaticShortcut[] = [
  ['qk-file-icon', 'inline-block shrink-0 align-middle', { layer: 'qk-recipes' }],
  ['qk-file-icon__badge', '[fill:white] font-semibold [font-family:var(--qk-type-body-font-family)]', { layer: 'qk-recipes' }]
];
/** Each family can be independently themed without recoloring its enclosing card. */
export const fileIconStaticCss = `
.qk-file-icon { color: var(--qk-file-icon-file, #7b879a); }
.qk-file-icon[data-kind="document"] { color: var(--qk-file-icon-document, #4878e8); }
.qk-file-icon[data-kind="spreadsheet"] { color: var(--qk-file-icon-spreadsheet, #29976b); }
.qk-file-icon[data-kind="presentation"] { color: var(--qk-file-icon-presentation, #e08041); }
.qk-file-icon[data-kind="pdf"] { color: var(--qk-file-icon-pdf, #de6265); }
.qk-file-icon[data-kind="ofd"] { color: var(--qk-file-icon-ofd, #6b7fd7); }
.qk-file-icon[data-kind="image"] { color: var(--qk-file-icon-image, #36a0a6); }
.qk-file-icon[data-kind="video"] { color: var(--qk-file-icon-video, #8c6be8); }
.qk-file-icon[data-kind="audio"] { color: var(--qk-file-icon-audio, #c464ab); }
.qk-file-icon[data-kind="archive"] { color: var(--qk-file-icon-archive, #be913c); }
.qk-file-icon[data-kind="code"] { color: var(--qk-file-icon-code, #6680ba); }
.qk-file-icon[data-kind="web"] { color: var(--qk-file-icon-web, #548ed4); }
.qk-file-icon[data-kind="markdown"] { color: var(--qk-file-icon-markdown, #547cdf); }
.qk-file-icon[data-kind="text"] { color: var(--qk-file-icon-text, #8594ad); }
.qk-file-icon[data-kind="design"] { color: var(--qk-file-icon-design, #b478c9); }
.qk-file-icon[data-kind="font"] { color: var(--qk-file-icon-font, #8b79a8); }
@media (forced-colors: active) { .qk-file-icon { forced-color-adjust: none; color: CanvasText !important; } .qk-file-icon__badge { fill: Canvas; } }
`;
/** Public standalone CSS discovery. */
export const fileIconRecipeCatalog = Object.freeze(fileIconShortcuts.map(shortcut => shortcut[0]));
