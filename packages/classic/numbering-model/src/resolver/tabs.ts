import { resolveWordParagraphFormatting, wordParagraphMeasurementToTwips, type WordParagraphTabStop } from "@quirekit/classic-paragraph-model";
import { resolveWordNamedParagraphStyle, type WordParagraphStyleRegistry } from "@quirekit/classic-styles-model";
import type { Node as ProseMirrorNode } from "@quirekit/pm";
import type { WordNumberingLevel } from "../types";
import { resolveEffectiveWordListIndentation } from "./indentation";
import type { ResolvedWordNumberingTab } from "./types";

/**
 * Collects tab-stop layers in inheritance order; same-position clears remain authoritative.
 *
 * @param level - Effective numbering level.
 * @param paragraph - Source paragraph with optional direct tabs.
 * @param styles - Named style registry.
 * @returns Ordered tab layers for measurement after character pitch is known.
 */
export function resolveWordNumberingTabs(level: WordNumberingLevel, paragraph: ProseMirrorNode, styles: WordParagraphStyleRegistry): readonly WordParagraphTabStop[] {
  const direct = resolveWordParagraphFormatting(paragraph.attrs.wordParagraph);
  const style = resolveWordNamedParagraphStyle(styles, direct.styleId).paragraph;
  const authored = level.paragraphTabs ?? (level.paragraphIndentation.start === null ? [] : [{
    position: level.paragraphIndentation.start, alignment: "start" as const
  }]);
  const bodyStart = resolveEffectiveWordListIndentation(level.paragraphIndentation, paragraph, styles).start;
  return [...style.tabs ?? [], ...authored, ...direct.tabs ?? [],
    ...(bodyStart === null ? [] : [{ position: bodyStart, alignment: "start" as const }])];
}

/**
 * Resolves a marker suffix's next tab in logical paragraph coordinates.
 *
 * @param endTwips - Measured marker end from the paragraph logical origin.
 * @param tabs - Style, level and direct stops in precedence order.
 * @param characterPitchTwips - Effective relative-unit pitch.
 * @param defaultIntervalTwips - Document default interval, normally 720 twips.
 * @returns Logical text start at an active stop at or beyond the marker.
 */
export function resolveWordNumberingTabPosition(
  endTwips: number,
  tabs: readonly WordParagraphTabStop[],
  characterPitchTwips: number,
  defaultIntervalTwips = 720
): number {
  return resolveWordNumberingTab(endTwips, tabs, characterPitchTwips, defaultIntervalTwips).positionTwips;
}

/**
 * Resolves a suffix tab without losing whether its target came from a stop or grid.
 *
 * @param endTwips - Measured marker end from the paragraph logical origin.
 * @param tabs - Style, level and direct stops in precedence order.
 * @param characterPitchTwips - Effective relative-unit pitch.
 * @param defaultIntervalTwips - Document default interval, normally 720 twips.
 * @returns Tab target and its source for presentation-policy consumers.
 */
export function resolveWordNumberingTab(
  endTwips: number,
  tabs: readonly WordParagraphTabStop[],
  characterPitchTwips: number,
  defaultIntervalTwips = 720
): ResolvedWordNumberingTab {
  const positions = new Map<number, WordParagraphTabStop["alignment"]>();
  for (const tab of tabs) positions.set(wordParagraphMeasurementToTwips(tab.position, characterPitchTwips), tab.alignment);
  const explicit = [...positions].filter(([position, alignment]) => position >= endTwips - 0.01
    && alignment !== "clear" && alignment !== "bar").sort(([a], [b]) => a - b)[0];
  if (explicit) return { positionTwips: explicit[0], source: "stop" };
  const interval = Number.isFinite(defaultIntervalTwips) && defaultIntervalTwips > 0 ? defaultIntervalTwips : 720;
  let next = (Math.floor(endTwips / interval) + 1) * interval;
  while (positions.get(next) === "clear") next += interval;
  return { positionTwips: next, source: "default-grid" };
}
