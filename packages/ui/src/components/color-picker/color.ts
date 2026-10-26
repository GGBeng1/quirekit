import type { Color } from "@ark-ui/vue/color-picker";
import { parseColor } from "@ark-ui/vue/color-picker";

/** QuireKit Color Picker 的安全回退颜色。 */
export const quireColorPickerFallbackValue = "#1677FF";

/**
 * 把 CSS 颜色字符串解析为 Ark/Zag Color，并为无效输入提供稳定回退。
 *
 * @param value - 调用方提供的 CSS 颜色字符串。
 * @param fallback - 输入无效时使用的 CSS 颜色字符串。
 * @returns 可交给 Ark Color Picker machine 的颜色对象。
 */
export function parseQuireColor(
  value: string | undefined,
  fallback = quireColorPickerFallbackValue
): Color {
  try {
    return parseColor(value ?? fallback);
  } catch {
    return parseColor(fallback);
  }
}

/**
 * 把 Ark/Zag Color 投影为稳定的 HEX/HEXA 公共值。
 *
 * @param color - Ark Color Picker machine 返回的颜色对象。
 * @returns 不透明颜色使用 HEX，透明颜色使用 HEXA 的 CSS 字符串。
 */
export function serializeQuireColor(color: Color): string {
  return color.getChannelValue("alpha") >= 1
    ? color.toString("hex").toUpperCase()
    : color.toString("hexa").toUpperCase();
}
