/**
 * Paint-only adjustments for operating-system accessibility preferences.
 * System colors retain the user's palette; outlines preserve recipe geometry.
 * The preference layer follows recipes and remains below application utilities.
 */
export const appearanceCss = `
@media (forced-colors: active) {
  .qk-button { background-color: ButtonFace; color: ButtonText; border-color: ButtonText; }
  .qk-segmented { background-color: Canvas; color: CanvasText; }
  .qk-button:focus-visible,
  .qk-checkbox__control[data-focus-visible],
  .qk-radio-group__control[data-focus-visible],
  .qk-switch__control[data-focus-visible],
  .qk-segmented__item[data-focus-visible],
  .qk-slider__thumb:focus-visible,
  .qk-dialog__close-trigger:focus-visible,
  .qk-drawer__close-trigger:focus-visible,
  .qk-popover__close-trigger:focus-visible {
    outline: 2px solid CanvasText;
    outline-offset: 2px;
  }
  .qk-checkbox__control,
  .qk-radio-group__control,
  .qk-switch__control {
    background-color: Canvas;
    border-color: ButtonText;
    color: CanvasText;
  }
  .qk-checkbox__control[data-state=checked],
  .qk-checkbox__control[data-state=indeterminate],
  .qk-switch__control[data-state=checked] {
    background-color: CanvasText;
    border-color: Highlight;
    color: Canvas;
  }
  .qk-checkbox__mixed-mark { background-color: Canvas; }
  .qk-radio-group__mark { background-color: CanvasText; }
  .qk-switch__thumb { background-color: ButtonText; outline: none; }
  .qk-switch__thumb[data-state=checked] { background-color: Canvas; }
  .qk-segmented__indicator { background-color: CanvasText; outline: 1px solid CanvasText; outline-offset: -1px; }
  .qk-segmented__item[data-state=checked] { color: Canvas; }
  .qk-segmented__item[data-state=checked][data-focus-visible] {
    outline-color: Canvas;
    outline-offset: -3px;
  }
  .qk-menu__item[data-highlighted],
  .qk-select__item[data-highlighted],
  .qk-combobox__item[data-highlighted],
  .qk-listbox__item:not(.qk-preset-gallery__item)[data-selected],
  .qk-tree-view--selection-background .qk-tree-view__item[data-selected],
  .qk-tree-view--selection-background .qk-tree-view__branch-control[data-selected] {
    background-color: CanvasText;
    color: Canvas;
    outline: 1px solid CanvasText;
    outline-offset: -1px;
  }
  .qk-menu__item[data-highlighted] :is(.qk-menu__trailing,.qk-menu__shortcut,.qk-menu__disclosure),
  .qk-listbox__item[data-selected] :is(.qk-listbox__item-description,.qk-listbox__indicator) {
    color: Canvas;
  }
  /* Inverse text uses the system pair without UA text backplates obscuring its glyphs.
     Only these text parts opt out; rows, icons, disabled states and previews retain auto. */
  .qk-menu__item[data-highlighted]:not([data-disabled]) :is(.qk-menu__label,.qk-menu__shortcut,.qk-action-menu__description),
  .qk-select__item[data-highlighted]:not([data-disabled]) .qk-select__item-label,
  .qk-combobox__item[data-highlighted]:not([data-disabled]) :is(.qk-combobox__item-label,.qk-combobox__item-description),
  .qk-listbox__item:not(.qk-preset-gallery__item)[data-selected]:not([data-disabled]) :is(.qk-listbox__item-label,.qk-listbox__item-description),
  .qk-tree-view--selection-background .qk-tree-view__item[data-selected]:not([data-disabled]) .qk-tree-view__label,
  .qk-tree-view--selection-background .qk-tree-view__branch-control[data-selected]:not([data-disabled]) .qk-tree-view__label {
    forced-color-adjust: none;
    background-color: CanvasText;
    color: Canvas;
  }
  .qk-tree-view--selection-text .qk-tree-view__item[data-selected],
  .qk-tree-view--selection-text .qk-tree-view__branch-control[data-selected] {
    text-decoration: underline;
    text-underline-offset: 3px;
  }
  .qk-listbox__item:not(.qk-preset-gallery__item)[data-focus-visible],
  .qk-tree-view__item:focus-visible,
  .qk-tree-view__branch-control:focus-visible,
  .qk-menu__context-trigger:focus-visible {
    outline: 2px solid CanvasText;
    outline-offset: -2px;
  }
  .qk-listbox__item:not(.qk-preset-gallery__item)[data-selected][data-focus-visible],
  .qk-tree-view--selection-background .qk-tree-view__item[data-selected]:focus-visible,
  .qk-tree-view--selection-background .qk-tree-view__branch-control[data-selected]:focus-visible {
    outline-color: Canvas;
    outline-style: dotted;
  }
  .qk-preset-gallery__item { background-color: Canvas; border-color: Canvas; outline: none; }
  .qk-preset-gallery__preview { border-color: CanvasText; outline-color: CanvasText; }
  .qk-preset-gallery__preview[data-selected] { border-color: Highlight; }
  .qk-slider__track { background-color: Canvas; outline: 1px solid ButtonText; }
  .qk-slider__range { background-color: CanvasText; }
  .qk-slider__thumb { background-color: Canvas; border-color: CanvasText; }
  .qk-menu__separator,
  .qk-tree-view__indent-guide { background-color: CanvasText; }
  .qk-dialog__content,
  .qk-drawer__content,
  .qk-popover__content,
  .qk-tooltip__content,
  .qk-menu,
  .qk-select__content,
  .qk-combobox__content,
  .qk-color-picker__content {
    background-color: Canvas;
    color: CanvasText;
    outline: 1px solid CanvasText;
    outline-offset: -1px;
    box-shadow: none;
  }
  .qk-tabs__indicator { background-color: CanvasText; }
  .qk-toolbar__item[data-state=on],
  .qk-toolbar__item[data-state=open],
  .qk-pagination__item[aria-current=page] {
    background-color: CanvasText;
    color: Canvas;
    outline: 1px solid CanvasText;
    outline-offset: -1px;
  }
  .qk-tabs__trigger:focus-visible,
  .qk-toolbar__item:focus-visible,
  .qk-pagination__item:focus-visible,
  .qk-pagination__trigger:focus-visible,
  .qk-color-picker__swatch-trigger:focus-visible,
  .qk-color-picker__trigger:focus-visible,
  .qk-color-picker__reset:focus-visible,
  .qk-color-picker__more:focus-visible {
    outline: 2px solid CanvasText;
    outline-offset: 2px;
  }
  .qk-progress__track { background-color: Canvas; outline: 1px solid CanvasText; }
  .qk-progress__range { background-color: CanvasText; }
  .qk-progress__circle-track { stroke: Canvas; }
  .qk-progress__circle-range { stroke: CanvasText; }
  .qk-color-picker__swatch,
  .qk-color-picker__current-swatch,
  .qk-color-picker__trigger-swatch { forced-color-adjust: none; outline: 1px solid CanvasText; outline-offset: -1px; }
  .qk-color-picker__swatch-trigger[data-state=checked] { border-color: CanvasText; }
  .qk-color-picker__trigger-none,
  .qk-color-picker__none-swatch { background-image: none; background-color: Canvas; border-color: CanvasText; }
  .qk-color-picker__trigger-none::after,
  .qk-color-picker__none-swatch::after {
    content: "";
    position: absolute;
    inset: 50% 0 auto;
    border-top: 1px solid CanvasText;
    transform: rotate(-45deg);
  }
  .qk-button:disabled,
  .qk-segmented__item[data-disabled],
  .qk-menu__item[data-disabled],
  .qk-listbox__item[data-disabled],
  .qk-tree-view__item[data-disabled],
  .qk-tree-view__branch-control[data-disabled] { color: GrayText; }
  .qk-listbox__item[data-selected][data-disabled] { background-color: Canvas; color: GrayText; outline-color: GrayText; }
  .qk-listbox__item[data-disabled] :is(.qk-listbox__item-description,.qk-listbox__indicator),
  .qk-preset-gallery__item[data-disabled] :is(.qk-preset-gallery__label,.qk-preset-gallery__description) { color: GrayText; }
  .qk-preset-gallery__item[data-disabled] .qk-preset-gallery__preview { border-color: GrayText; }
  .qk-checkbox__control[data-disabled],
  .qk-radio-group__control[data-disabled],
  .qk-switch__control[data-disabled],
  .qk-slider__thumb[data-disabled] {
    background-color: Canvas;
    border-color: GrayText;
    color: GrayText;
  }
  .qk-checkbox__control[data-disabled] .qk-checkbox__mixed-mark,
  .qk-radio-group__control[data-disabled] .qk-radio-group__mark,
  .qk-switch__thumb[data-disabled],
  .qk-slider__range[data-disabled] { background-color: GrayText; }
}
@media (prefers-reduced-motion: reduce) {
  .qk-button,
  .qk-menu,
  .qk-menu__item,
  .qk-select__content,
  .qk-select__indicator,
  .qk-combobox__content,
  .qk-combobox__trigger,
  .qk-popover__content,
  .qk-popover__close-trigger { transition-duration: 0s; }
  .qk-button__spinner { animation: none; }
}
`;
