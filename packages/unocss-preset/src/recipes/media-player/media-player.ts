import type { StaticShortcut } from "@unocss/core";

/** Shared media anatomy uses the same semantic surfaces and controls in both themes. */
export const mediaPlayerShortcuts: StaticShortcut[] = [
  ["qk-media-player", "relative min-w-0 w-full rounded-qk-group border border-solid border-qk-border-subtle bg-qk-surface-page text-qk-text-primary text-qk-compact leading-qk-compact", { layer: "qk-recipes" }],
  ["qk-media-player__header", "flex items-center gap-2 min-w-0 px-qk-surface py-qk-surface-compact text-qk-text-secondary", { layer: "qk-recipes" }],
  ["qk-media-player__title", "truncate min-w-0 font-medium text-qk-text-primary", { layer: "qk-recipes" }],
  ["qk-media-player__stage", "relative w-full overflow-hidden bg-qk-surface-subtle", { layer: "qk-recipes" }],
  ["qk-media-player__audio-source", "hidden", { layer: "qk-recipes" }],
  ["qk-media-player__media", "block w-full h-full object-contain", { layer: "qk-recipes" }],
  ["qk-media-player__picture-action", "absolute inset-0 grid place-items-center border-0 bg-transparent cursor-pointer p-0", { layer: "qk-recipes" }],
  ["qk-media-player__picture-icon", "grid place-items-center size-10 rounded-full bg-qk-surface-overlay text-qk-text-primary shadow-qk-raised", { layer: "qk-recipes" }],
  ["qk-media-player__body", "min-w-0 px-qk-surface py-qk-surface-compact", { layer: "qk-recipes" }],
  ["qk-media-player__audio-heading", "flex min-w-0 items-center", { layer: "qk-recipes" }],
  ["qk-media-player__controls", "flex min-w-0 items-center gap-qk-inline", { layer: "qk-recipes" }],
  ["qk-media-player__timeline", "flex items-center gap-3 min-w-0 flex-1", { layer: "qk-recipes" }],
  ["qk-media-player__seek", "min-w-0 flex-1", { layer: "qk-recipes" }],
  ["qk-media-player__track", "relative overflow-hidden w-full h-1 rounded-full bg-qk-surface-selected", { layer: "qk-recipes" }],
  ["qk-media-player__thumb", "grid size-2 cursor-grab place-items-center rounded-full border-0 bg-qk-action-primary [outline:none] data-[dragging]:cursor-grabbing data-[disabled]:cursor-not-allowed data-[disabled]:bg-qk-border-disabled", { layer: "qk-recipes" }],
  ["qk-media-player__time", "shrink-0 tabular-nums text-qk-helper text-qk-text-secondary whitespace-nowrap", { layer: "qk-recipes" }],
  ["qk-media-player__options", "flex items-center shrink-0 gap-1", { layer: "qk-recipes" }],
  ["qk-media-player__volume", "w-44 flex items-center gap-2", { layer: "qk-recipes" }],
  ["qk-media-player__status", "flex flex-wrap items-center gap-2 mt-2 text-qk-helper text-qk-text-secondary", { layer: "qk-recipes" }]
];
/** Public anatomy included in standalone styles. */
export const mediaPlayerRecipeCatalog = Object.freeze(mediaPlayerShortcuts.map(shortcut => shortcut[0]));
/** Container-aware layout also covers players inside columns and their own fullscreen root. */
export const mediaPlayerStaticCss = `
.qk-media-player { container-type: inline-size; }
.qk-media-player__stage { aspect-ratio: 16/9; max-height: 420px; }
.qk-media-player__picture-action:hover .qk-media-player__picture-icon { background: var(--qk-color-surface-hover); }
.qk-media-player__time > span { color: var(--qk-color-text-tertiary); }
.qk-media-player__volume > .qk-slider { flex: 1; }
.qk-media-player__seek .qk-slider__control { min-height: 28px; }
.qk-media-player__thumb::before { content: ''; position: absolute; inset: -8px; }
.qk-media-player[data-kind=audio] { background: var(--qk-color-surface-subtle); }
.qk-media-player[data-kind=audio] .qk-media-player__body { display: grid; grid-template-columns: auto minmax(0,1fr) auto; gap: 0 var(--qk-space-surface-compact); }
.qk-media-player[data-kind=audio] .qk-media-player__audio-heading { grid-column: 2 / -1; grid-row: 1; }
.qk-media-player[data-kind=audio] .qk-media-player__controls { display: contents; }
.qk-media-player[data-kind=audio] .qk-media-player__controls > button { grid-column: 1; grid-row: 1 / span 2; align-self: center; }
.qk-media-player[data-kind=audio] .qk-media-player__timeline { grid-column: 2; grid-row: 2; }
.qk-media-player[data-kind=audio] .qk-media-player__options { grid-column: 3; grid-row: 2; }
.qk-media-player[data-kind=audio] .qk-media-player__status { grid-column: 2 / -1; }
.qk-media-player[data-error=load] .qk-media-player__stage { display: none; }
.qk-media-player:fullscreen { display: flex; flex-direction: column; border: 0; border-radius: 0; }
.qk-media-player:fullscreen .qk-media-player__stage { flex: 1; min-height: 0; max-height: none; aspect-ratio: auto; }
.qk-media-player:fullscreen .qk-media-player__body { flex-shrink: 0; }
@container (max-width: 480px) {
  .qk-media-player .qk-media-player__controls { display: grid; grid-template-columns: auto minmax(0,1fr) auto auto; gap: 4px 8px; }
  .qk-media-player .qk-media-player__timeline { display: contents; }
  .qk-media-player .qk-media-player__seek { grid-column: 2 / -1; grid-row: 1; }
  .qk-media-player .qk-media-player__time { grid-column: 2; grid-row: 2; }
  .qk-media-player .qk-media-player__options { grid-column: 3; grid-row: 2; }
  .qk-media-player .qk-media-player__controls > button { grid-column: 1; grid-row: 1; }
  .qk-media-player .qk-media-player__controls > .qk-media-player__fullscreen { grid-column: 4; grid-row: 2; }
  .qk-media-player[data-kind=audio] .qk-media-player__seek { grid-column: 2 / -1; grid-row: 2; }
  .qk-media-player[data-kind=audio] .qk-media-player__time { grid-column: 2; grid-row: 3; }
  .qk-media-player[data-kind=audio] .qk-media-player__options { grid-column: 3; grid-row: 3; }
}
@media (pointer: coarse) {
  .qk-media-player__seek .qk-slider__control { min-height: 32px; }
}
@media (forced-colors: active) {
  .qk-media-player__thumb { background-color: Highlight; }
}
`;
