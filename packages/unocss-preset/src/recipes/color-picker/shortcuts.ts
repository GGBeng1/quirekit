import type { UserShortcuts } from "@unocss/core";
import { colorPickerEditorShortcuts } from "./editor";
import { colorPickerPaletteShortcuts } from "./palette";

/** Color Picker 各层共享的 UnoCSS shortcuts。 */
export const colorPickerShortcuts = [
  ...colorPickerPaletteShortcuts,
  ...colorPickerEditorShortcuts
] satisfies UserShortcuts;
