import type { WordNumberingLevel } from "../types";
import { formatWordNumberingCounter } from "./format";

/**
 * Expands marker text using each referenced level's format and language.
 *
 * @param level - Level whose marker template is being rendered.
 * @param levels - Effective definition, including ancestors.
 * @param counters - Current sequence values; omitted counters use their level starts.
 * @returns Visible marker shared by document rendering and previews.
 */
export function formatWordNumberingMarker(
  level: WordNumberingLevel,
  levels: Readonly<Record<string, WordNumberingLevel>>,
  counters: Readonly<Record<number, number | undefined>>
): string {
  if (level.format === "bullet") return level.text;
  return level.text.replace(/%([1-9])/gu, (_match, rawIndex: string) => {
    const index = Number(rawIndex) - 1;
    const referenced = levels[String(index)];
    const value = counters[index] ?? referenced?.start ?? 1;
    return referenced === undefined || referenced.format === "bullet"
      ? String(value)
      : formatWordNumberingCounter(level.isLegal ? "decimal" : referenced.format, value, {
          customFormat: referenced.customFormat,
          language: referenced.markerStyle?.language
        });
  });
}
