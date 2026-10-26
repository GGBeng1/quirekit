import { tableSizePickerShortcuts } from "../recipes/table-size-picker";
import { nativeScrollbarStaticCss } from "../recipes/shared/native-scrollbar";
import { htmlSandboxShortcuts, htmlSandboxStaticCss } from "../recipes/html-sandbox";
import { hierarchyPickerStaticCss } from '../recipes/hierarchy-picker';
import { codeBlockStaticCss } from '../recipes/code-block';
import { descriptionsStaticCss } from '../recipes/descriptions';
import { structuredViewerStaticCss } from '../recipes/structured-viewers';
import { terminalOutputStaticCss } from '../recipes/terminal-output';
import { proseStaticCss } from '../recipes/prose';
import { selectionHandlesShortcuts, selectionHandlesStaticCss } from '../recipes/selection-handles';
import type { Preset, Rule } from "@unocss/core";
import { quireKitUnoTheme } from "../theme/bridge";
import { typographySemanticCss, typographyShortcuts } from "../typography";
import {
  chatShortcuts,
  chatStaticCss,
  commentShortcuts,
  commentStaticCss,
  sourceShortcuts,
  sourceStaticCss,
  shimmerShortcuts,
  shimmerStaticCss,
  fileIconShortcuts,
  fileIconStaticCss,
  horizontalStripStaticCss,
  attachmentShortcuts,
  attachmentStaticCss,
  badgeShortcuts,
  dateInputShortcuts,
  timeInputShortcuts,
  calendarShortcuts,
  datePickerShortcuts,
  timePickerShortcuts,
  timeRangePickerShortcuts,
  dateTimePickerShortcuts,
  dateTimeRangePickerShortcuts,
  cardShortcuts,
  floatingPanelShortcuts,
  separatorShortcuts,
  codeBlockShortcuts,
  proseShortcuts,
  descriptionsShortcuts,
  hierarchyPickerShortcuts,
  hoverCardShortcuts,
  popconfirmShortcuts,
  imagePreviewShortcuts,
  timelineShortcuts,
  timelineStaticCss,
  resultShortcuts,
  controlGroupShortcuts,
  pinInputShortcuts,
  statisticShortcuts,
  ratingShortcuts,
  qrCodeShortcuts,
  carouselShortcuts,
  imageCropperShortcuts,
  transferShortcuts,
  transferStaticCss,
  controlGroupStaticCss,
  anchorShortcuts,
  spaceShortcuts,
  breadcrumbShortcuts,
  navigationMenuShortcuts,
  commandPaletteShortcuts,
  stepsShortcuts,
  dateRangePickerShortcuts,
  tagShortcuts,
  skeletonShortcuts,
  kbdShortcuts,
  checkboxGroupShortcuts,
  toggleGroupShortcuts,
  tableShortcuts,
  skeletonStaticCss,
  tableStaticCss,
  alertShortcuts,
  accordionShortcuts,
  actionSheetShortcuts,
  actionMenuShortcuts,
  choicePickerShortcuts,
  presetPickerShortcuts,
  avatarShortcuts,
  avatarStaticCss,
  buttonShortcuts,
  checkboxShortcuts,
  collapsibleShortcuts,
  comboboxShortcuts,
  colorPickerShortcuts,
  colorPickerStaticCss,
  dialogShortcuts,
  dialogStaticCss,
  imagePreviewStaticCss,
  drawerShortcuts,
  drawerStaticCss,
  emptyStateShortcuts,
  listboxShortcuts,
  listboxStaticCss,
  presetGalleryShortcuts,
  emojiPickerShortcuts,
  fieldShortcuts,
  formShortcuts,
  fieldsetShortcuts,
  fileUploadShortcuts,
  fileUploadStaticCss,
  iconShortcuts,
  iconStaticCss,
  inputNumberShortcuts,
  inputNumberStaticCss,
  inputShortcuts,
  inputStaticCss,
  inspectorShortcuts,
  menuShortcuts,
  paginationShortcuts,
  paginationStaticCss,
  progressShortcuts,
  progressStaticCss,
  popoverShortcuts,
  popoverStaticCss,
  radioGroupShortcuts,
  scrollAreaShortcuts,
  scrollAreaStaticCss,
  splitterShortcuts,
  splitterStaticCss,
  segmentedShortcuts,
  sliderShortcuts,
  mediaPlayerShortcuts,
  mediaPlayerStaticCss,
  selectShortcuts,
  switchShortcuts,
  tagsInputShortcuts,
  editableShortcuts,
  clipboardShortcuts,
  tabsShortcuts,
  textareaShortcuts,
  tooltipShortcuts,
  toolbarShortcuts,
  toastShortcuts,
  toastStaticCss,
  treeViewShortcuts,
  treeViewStaticCss
} from "../recipes";
import { createKeyboardFocusCss } from "./focus";
import { createQuireKitPreflightCss } from "./preflight";
import { appearanceCss } from "./appearance";
import type { QuireKitUnoPresetOptions } from "./types";

/**
 * Creates the framework-neutral QuireKit UI preset.
 *
 * @param options - Semantic-theme output controls.
 * @returns UnoCSS preset exposing semantic theme values and utilities.
 */
export function presetQuireKit(
  options: QuireKitUnoPresetOptions = {}
): Preset {
  const defaultTokens = options.defaultTokens ?? true;

  /**
   * Resolves preflight CSS from the normalized options captured by this preset.
   *
   * @returns Preset-owned semantic-theme preflight CSS.
   */
  function getPreflightCss(): string {
    return `${createQuireKitPreflightCss({
      includeDefaultTokens: defaultTokens
    })}\n${nativeScrollbarStaticCss}\n${skeletonStaticCss}\n${tableStaticCss}\n${avatarStaticCss}\n${iconStaticCss}\n${inputStaticCss}\n${inputNumberStaticCss}\n${colorPickerStaticCss}\n${dialogStaticCss}\n${imagePreviewStaticCss}\n${drawerStaticCss}\n${paginationStaticCss}\n${progressStaticCss}\n${popoverStaticCss}\n${scrollAreaStaticCss}\n${splitterStaticCss}\n${toastStaticCss}\n${treeViewStaticCss}`;
  }

  return {
    name: "@quirekit/unocss-preset",
    theme: quireKitUnoTheme,
    // Wind3's weight matcher excludes hyphenated names; explicitly project our
    // namespaced weights so recipes and standalone utilities share one contract.
    rules: Object.entries(quireKitUnoTheme.fontWeight).map(([name, value]): Rule => [
      `font-${name}`, { "font-weight": value }
    ]),
    shortcuts: [
      ...chatShortcuts,
      ...commentShortcuts,
      ...sourceShortcuts,
      ...shimmerShortcuts,
      ...htmlSandboxShortcuts,
      ...attachmentShortcuts,
      ...fileIconShortcuts,
      ...typographyShortcuts,
      ...badgeShortcuts,
      ...dateInputShortcuts,
      ...timeInputShortcuts,
      ...calendarShortcuts,
      ...datePickerShortcuts,
      ...timePickerShortcuts,
      ...timeRangePickerShortcuts,
      ...dateTimePickerShortcuts,
      ...dateTimeRangePickerShortcuts,
      ...cardShortcuts,
      ...floatingPanelShortcuts,
      ...separatorShortcuts,
      ...codeBlockShortcuts,
      ...proseShortcuts,
      ...descriptionsShortcuts,
      ...hierarchyPickerShortcuts,
      ...hoverCardShortcuts,
      ...popconfirmShortcuts,
      ...imagePreviewShortcuts,
      ...timelineShortcuts,
      ...resultShortcuts,
      ...controlGroupShortcuts,
      ...pinInputShortcuts,
      ...statisticShortcuts,
      ...ratingShortcuts,
      ...qrCodeShortcuts,
      ...carouselShortcuts,
      ...imageCropperShortcuts,
      ...selectionHandlesShortcuts,
      ...transferShortcuts,
      ...anchorShortcuts,
      ...spaceShortcuts,
      ...breadcrumbShortcuts,
      ...navigationMenuShortcuts,
      ...commandPaletteShortcuts,
      ...stepsShortcuts,
      ...dateRangePickerShortcuts,
      ...tagShortcuts,
      ...skeletonShortcuts,
      ...kbdShortcuts,
      ...checkboxGroupShortcuts,
      ...toggleGroupShortcuts,
      ...tableShortcuts,
      ...alertShortcuts,
      ...accordionShortcuts,
      ...actionSheetShortcuts,
      ...actionMenuShortcuts,
      ...choicePickerShortcuts,
      ...presetPickerShortcuts,
      ...avatarShortcuts,
      ...buttonShortcuts,
      ...checkboxShortcuts,
      ...collapsibleShortcuts,
      ...comboboxShortcuts,
      ...colorPickerShortcuts,
      ...dialogShortcuts,
      ...drawerShortcuts,
      ...emptyStateShortcuts,
      ...listboxShortcuts,
      ...tableSizePickerShortcuts,
      ...presetGalleryShortcuts,
      ...emojiPickerShortcuts,
      ...fieldShortcuts,
      ...formShortcuts,
      ...fieldsetShortcuts,
      ...fileUploadShortcuts,
      ...iconShortcuts,
      ...inputShortcuts,
      ...inputNumberShortcuts,
      ...inspectorShortcuts,
      ...menuShortcuts,
      ...paginationShortcuts,
      ...progressShortcuts,
      ...popoverShortcuts,
      ...radioGroupShortcuts,
      ...scrollAreaShortcuts,
      ...splitterShortcuts,
      ...segmentedShortcuts,
      ...sliderShortcuts,
      ...mediaPlayerShortcuts,
      ...selectShortcuts,
      ...switchShortcuts,
      ...tagsInputShortcuts,
      ...editableShortcuts,
      ...clipboardShortcuts,
      ...tabsShortcuts,
      ...textareaShortcuts,
      ...tooltipShortcuts,
      ...toolbarShortcuts,
      ...toastShortcuts,
      ...treeViewShortcuts
    ],
    layers: {
      "qk-tokens": -20,
      "qk-recipes": -5,
      "qk-preferences": -4
    },
    preflights: [
      {
        layer: "qk-recipes",
        getCSS: () => mediaPlayerStaticCss + typographySemanticCss + codeBlockStaticCss + proseStaticCss + descriptionsStaticCss + hierarchyPickerStaticCss + timelineStaticCss + controlGroupStaticCss + transferStaticCss + chatStaticCss + commentStaticCss + sourceStaticCss + shimmerStaticCss + fileUploadStaticCss + attachmentStaticCss + fileIconStaticCss + horizontalStripStaticCss + structuredViewerStaticCss + terminalOutputStaticCss + selectionHandlesStaticCss + htmlSandboxStaticCss
      },
      {
        layer: "qk-recipes",
        getCSS: () => listboxStaticCss
      },
      {
        layer: "qk-tokens",
        getCSS: getPreflightCss
      },
      {
        layer: "qk-preferences",
        getCSS: () => `${appearanceCss}\n${createKeyboardFocusCss()}`
      }
    ]
  };
}
