import type { QuireMarkCanvasStyleResolver, QuireNodeCanvasTextStyle } from "@quirekit/core";
import type { Mark as ProseMirrorMark } from "@quirekit/pm";
import { readQuireCssFontFamilies } from "../document-font-theme/css-font";

/**
 * Parses one direct CSS family value into exact ordered candidates.
 *
 * @param value - Mark family value, which may contain a CSS family list.
 * @returns Unquoted families in source order.
 */
export function readFontFamilyList(value: string | undefined): readonly string[] {
  const family = readNonEmptyStyleValue(value);
  return family === undefined
    ? []
    : readQuireCssFontFamilies(`1px ${family}`);
}

/**
 * Reads one non-empty font family or language value from a canvas style.
 *
 * @param value - Candidate style value.
 * @returns Trimmed style value, or undefined.
 */
export function readNonEmptyStyleValue(value: string | undefined): string | undefined {
  return typeof value === "string" && value.trim().length > 0
    ? value.trim()
    : undefined;
}

/** @param marks - Direct marks. @param resolve - Cached mark resolver. @param inherited - Base properties. @returns Base-to-direct style deltas. */
export function styleDeltas(marks: readonly ProseMirrorMark[], resolve: QuireMarkCanvasStyleResolver | undefined, inherited: QuireNodeCanvasTextStyle | null | undefined) {
  return [...(inherited ? [inherited] : []), ...marks.flatMap(mark => { const style = resolve?.(mark); return style ? [style] : []; })];
}
