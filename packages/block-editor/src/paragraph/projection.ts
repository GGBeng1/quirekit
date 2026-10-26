import { resolveWordParagraphFormatting, type WordParagraphMeasurement } from "@quirekit/classic-paragraph-model";
import type { Node } from "@quirekit/pm";
import type { BlockParagraphValues } from "./types";
/** @param value - Canonical measurement. @returns Numeric points without guessing character pitch. */
function points(value: WordParagraphMeasurement | null): number | null { return !value ? 0 : value.unit === "dxa" ? value.value / 20 : null; }
/** @param node - Selected node. @returns Fields understood by the product, or null outside scope. */
export function readParagraphValues(node: Node): BlockParagraphValues | null {
  if (!["paragraph", "heading"].includes(node.type.name)) return null;
  const value = resolveWordParagraphFormatting(node.attrs.wordParagraph), spacing = value.spacing;
  return { alignment: value.alignment ?? "start", start: points(value.indentation.start), end: points(value.indentation.end), firstLine: points(value.indentation.firstLine),
    line: !spacing.line ? null : spacing.line.rule === "auto" ? spacing.line.value / 240 : null,
    before: (spacing.beforeLines ?? 0) > 0 || spacing.beforeAutoSpacing || !spacing.before ? null : points(spacing.before),
    after: (spacing.afterLines ?? 0) > 0 || spacing.afterAutoSpacing || !spacing.after ? null : points(spacing.after) };
}
/** @param value - Canonical measurement. @returns CSS projection; null means inherit Prose styling. */
function length(value: WordParagraphMeasurement | null): string | null { return !value ? null : value.unit === "dxa" ? `${value.value / 20}pt` : `${value.value / 100}em`; }
/**
 * Projects direct formatting without introducing a second persisted model.
 * @param node - Canonical paragraph-like node.
 * @returns Inline CSS shared by editing and static HTML serialization.
 */
export function paragraphCSS(node: Node): string {
  const value = resolveWordParagraphFormatting(node.attrs.wordParagraph), spacing = value.spacing;
  // A zero line-unit value disables that alternative; the physical value still
  // applies. Automatic spacing keeps the canonical owner's physical fallback.
  const styles: Record<string, string | null> = {
    "text-align": value.alignment === "distribute" ? "justify" : value.alignment,
    direction: value.direction,
    "padding-inline-start": length(value.indentation.start),
    "padding-inline-end": length(value.indentation.end),
    "text-indent": length(value.indentation.firstLine),
    "margin-block-start": spacing.beforeAutoSpacing !== true && (spacing.beforeLines ?? 0) > 0 ? `${(spacing.beforeLines ?? 0) / 100}lh` : length(spacing.before),
    "margin-block-end": spacing.afterAutoSpacing !== true && (spacing.afterLines ?? 0) > 0 ? `${(spacing.afterLines ?? 0) / 100}lh` : length(spacing.after),
    "line-height": !spacing.line ? null : spacing.line.rule === "auto" ? String(spacing.line.value / 240)
      : spacing.line.rule === "exact" ? `${spacing.line.value / 20}pt` : `max(1.5em, ${spacing.line.value / 20}pt)`
  };
  return Object.entries(styles).filter(([, v]) => v !== null).map(([key, v]) => `${key}:${v}`).join(";");
}
