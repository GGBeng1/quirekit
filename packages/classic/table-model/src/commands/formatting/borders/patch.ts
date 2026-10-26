import type { WordTableBorder } from "../../../types";
import type { WordTableCellBorderFormat } from "../../types";

/** @param format - Potentially invalid public patch. @returns Normalized nonempty patch, or null for unsupported values. */
export function normalizeBorderFormat(format: WordTableCellBorderFormat): WordTableCellBorderFormat | null {
  if (!format || typeof format !== "object" || Array.isArray(format)) return null;
  const keys = Object.keys(format);
  if (!keys.length || keys.some(key => !["style", "size", "color"].includes(key) || format[key as keyof WordTableCellBorderFormat] == null)) return null;
  if (format.style !== undefined && !["single", "double", "dotted", "dashed"].includes(format.style)) return null;
  if (format.size !== undefined && (!Number.isInteger(format.size) || format.size < 2 || format.size > 96)) return null;
  if (format.color !== undefined && (typeof format.color !== "string" || !/^(?:auto|[\da-f]{6})$/iu.test(format.color))) return null;
  return { ...format, ...(format.color === undefined ? {} : { color: format.color.toLowerCase() === "auto" ? "auto" : format.color.toUpperCase() }) };
}

/** @param border - Existing visible candidate. @param format - Valid property patch. @returns Full tuple retaining all unedited fields. */
export function patchBorder(border: WordTableBorder, format: WordTableCellBorderFormat): WordTableBorder {
  return { ...border, ...format, ...(format.color === undefined ? {} : { themeColor: null, themeTint: null, themeShade: null }) };
}

/** @param left - Original tuple. @param right - Patched tuple. @returns Semantic equality including normalized colors and optional null fields. */
export function equalBorders(left: WordTableBorder, right: WordTableBorder): boolean {
  return Object.keys({ ...left, ...right }).every(key => {
    if (key === "color") return (left.color ?? "auto").toUpperCase() === (right.color ?? "auto").toUpperCase();
    return (left[key as keyof WordTableBorder] ?? null) === (right[key as keyof WordTableBorder] ?? null);
  });
}
