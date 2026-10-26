import type { Messages as QuireColorPickerMessages } from "../locale/components/color-picker";
import { quireKitDefaultLocale } from "../locale/resolve";
import type { QuireColorPaletteLabels } from "./types";

/**
 * Completes palette copy from the active language; host-supplied labels name this palette's purpose.
 *
 * @param labels - Host-supplied labels, such as "Shape fill" or "No fill".
 * @param messages - ColorPicker text of the active language; defaults to Chinese.
 * @returns Complete palette copy.
 */
export function resolveQuireColorPaletteLabels(
  labels: Partial<QuireColorPaletteLabels> | undefined,
  messages: QuireColorPickerMessages = quireKitDefaultLocale.messages.colorPicker
): QuireColorPaletteLabels {
  return {
    label: labels?.label ?? messages.documentPalette,
    defaultColor: labels?.defaultColor ?? messages.defaultColor,
    moreColors: labels?.moreColors ?? messages.more,
    recentColors: labels?.recentColors ?? messages.recent
  };
}

/**
 * Resolves the accessible name of the custom-color surface.
 *
 * @param label - Host-supplied name, if any.
 * @param messages - ColorPicker text of the active language; defaults to Chinese.
 * @returns Accessible name for the surface.
 */
export function resolveQuireCustomColorPanelLabel(
  label: string | undefined,
  messages: QuireColorPickerMessages = quireKitDefaultLocale.messages.colorPicker
): string {
  return label ?? messages.more;
}
