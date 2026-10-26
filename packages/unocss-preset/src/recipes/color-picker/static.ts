/** Color Picker 跨 anatomy 约束与窄屏面板切换所需的静态 CSS。 */
export const colorPickerStaticCss = [
  // The fixed secondary positioner never contributes to the first layer's measurement.
  ".qk-color-picker__content>.qk-color-picker__palette{--qk-color-picker-palette-width:calc(var(--qk-color-picker-columns,10) * 26px - 6px + var(--qk-space-surface) + var(--qk-space-surface));max-width:100%;background:var(--qk-color-surface-overlay);border-radius:var(--qk-radius-overlay);box-shadow:var(--qk-elevation-overlay)}",
  ".qk-color-picker__swatch-trigger:focus-visible{transform:scale(0.85)}",
  ".qk-color-picker__reset:focus-visible,.qk-color-picker__more:focus-visible{background-color:var(--qk-color-surface-hover)}",
  "@media (max-width: 640px){",
  ".qk-color-picker__content--editor{width:min(304px,calc(100vw - 16px))!important}",
  ".qk-color-picker__content--editor .qk-color-picker__palette{display:none!important}",
  ".qk-color-picker__content--editor .qk-color-picker__editor-positioner{position:static!important;transform:none!important;min-width:0!important}",
  ".qk-color-picker__content--editor .qk-color-picker__editor-panel{position:static!important;width:100%!important}",
  ".qk-color-picker__content--editor .qk-color-picker__editor{width:100%!important}",
  ".qk-color-picker__content--editor .qk-color-picker__editor-header{display:block!important}",
  "}"
].join("");
