import { resolveWordNamedCharacterStyle } from "./model/character";
import type { Node } from "@quirekit/pm";
import { wordCharacterStyleVariables } from "./serialization/character";
import { wordStyleTextCss } from "./serialization/text";
import {
  isPlainObject,
  mergeAttributes,
  type QuireNodeHTMLSerializationTransformMap
} from "@quirekit/core";
import type { DOMOutputSpec } from "@quirekit/pm";
import {
  resolveWordParagraphFormatting,
  type WordParagraphFormatting
} from "@quirekit/classic-paragraph-model";
import {
  resolveWordParagraphAppearance,
  resolveWordTableCellParagraphAppearance,
  type WordParagraphStyleRegistry,
  type WordTableStyleTextLayer
} from "./model";

/** Supplies the current document style registry to HTML serializer closures. */
export type WordParagraphStyleRegistryReader = () => WordParagraphStyleRegistry;

/**
 * Creates HTML transforms that project effective named-style appearance.
 *
 * The registry reader is evaluated for every serialization so mounted HTML
 * views observe undoable registry updates without rebuilding the schema.
 * Word `atLeast` line spacing and distributed alignment are intentionally
 * omitted because CSS has no exact equivalent; the canonical model remains
 * authoritative for DOCX round-trip and Canvas/SVG layout.
 *
 * @param types - Paragraph-like node names carrying Word style references.
 * @param readRegistry - Reader for the latest document style registry.
 * @returns HTML transforms keyed by configured node type.
 */
export function createWordStylesHTMLSerializationTransforms(
  types: readonly string[],
  readRegistry: WordParagraphStyleRegistryReader
): QuireNodeHTMLSerializationTransformMap {
  return Object.fromEntries(types.map((type) => [
    type,
    (node, output) => {
      const appearance = resolveWordParagraphAppearance(
        readRegistry(),
        resolveWordParagraphFormatting(node.attrs.wordParagraph)
      );
      const style = [createEffectiveStyleCss(resolveWordNamedCharacterStyle(readRegistry(), null, appearance.text).text, appearance.paragraph),
        wordCharacterStyleVariables(node, readRegistry(), appearance.text)].filter(Boolean).join("; ");
      return style.length === 0 ? output : mergeDOMOutputStyle(output, style);
    }
  ]));
}

/**
 * Compiles the effective paragraph CSS of a paragraph inside a styled table cell.
 *
 * The result is a complete replacement for the node's named-style CSS, so DOM
 * views can append it after the default serialization.
 *
 * @param registry - Paragraph style registry, or null when none is installed.
 * @param formattingValue - Candidate paragraph formatting node attribute.
 * @param tableLayer - Table-style layer of the containing cell.
 * @param node - Optional textblock for occurrence-aware character styles.
 * @returns CSS declaration list, or an empty string.
 */
export function createWordStylesTableCellParagraphCss(
  registry: WordParagraphStyleRegistry | null,
  formattingValue: unknown,
  tableLayer: WordTableStyleTextLayer,
  node?: Node
): string {
  const appearance = resolveWordTableCellParagraphAppearance(
    registry,
    resolveWordParagraphFormatting(formattingValue),
    tableLayer
  );
  return [createEffectiveStyleCss(registry ? resolveWordNamedCharacterStyle(registry, null, appearance.text).text : appearance.text, appearance.paragraph),
    node && registry ? wordCharacterStyleVariables(node, registry, appearance.text) : ""].filter(Boolean).join("; ");
}

/**
 * Compiles the exact CSS subset shared by named styles and HTML.
 *
 * @param text - Effective renderer-neutral named-style typography.
 * @param paragraph - Effective named plus direct paragraph formatting.
 * @returns Stable CSS declaration list, or an empty string.
 */
function createEffectiveStyleCss(
  text: ReturnType<typeof resolveWordParagraphAppearance>["text"],
  paragraph: WordParagraphFormatting
): string {
  const declarations = Object.entries(wordStyleTextCss(text)).map(([name, value]) => `${name}: ${value}`);
  if (
    paragraph.alignment !== null
    && paragraph.alignment !== "distribute"
  ) {
    declarations.push(`text-align: ${paragraph.alignment}`);
  }
  if (paragraph.direction !== null) {
    declarations.push(`direction: ${paragraph.direction}`);
  }
  const lineHeight = resolveExactCssLineHeight(
    paragraph,
    text.lineHeightScale
  );
  if (lineHeight !== null) declarations.push(`line-height: ${lineHeight}`);
  return declarations.join("; ");
}

/**
 * Resolves only line-spacing rules that HTML/CSS can represent faithfully.
 *
 * @param paragraph - Effective paragraph formatting.
 * @param inheritedScale - Named-style natural line-height scale.
 * @returns CSS line-height value or null for a preserved-only Word rule.
 */
function resolveExactCssLineHeight(
  paragraph: WordParagraphFormatting,
  inheritedScale: number | undefined
): string | null {
  const line = paragraph.spacing.line;
  if (line === null) {
    return isPositiveFinite(inheritedScale)
      ? formatCssNumber(inheritedScale)
      : null;
  }
  if (line.rule === "auto" && line.value > 0) {
    return formatCssNumber(line.value / 240);
  }
  if (line.rule === "exact" && line.value > 0) {
    return `${formatCssNumber(line.value / 20)}pt`;
  }
  return null;
}

/**
 * Adds style attributes while preserving the owner's tag and content hole.
 *
 * @param output - Existing node serializer output.
 * @param style - CSS declarations to merge after owner declarations.
 * @returns DOM output with merged style attributes.
 */
function mergeDOMOutputStyle(
  output: DOMOutputSpec,
  style: string
): DOMOutputSpec {
  if (!Array.isArray(output) || typeof output[0] !== "string") return output;
  const attributes = isPlainObject(output[1]) ? output[1] : null;
  if (attributes === null) {
    return [output[0], { style }, ...output.slice(1)] as DOMOutputSpec;
  }
  return [
    output[0],
    mergeAttributes(attributes, { style }),
    ...output.slice(2)
  ] as DOMOutputSpec;
}

/**
 * Checks whether a candidate scale can become a positive CSS metric.
 *
 * @param value - Candidate numeric scale.
 * @returns Whether the value is finite and greater than zero.
 */
function isPositiveFinite(value: number | undefined): value is number {
  return typeof value === "number" && Number.isFinite(value) && value > 0;
}

/**
 * Produces stable decimal CSS numbers without floating-point noise.
 *
 * @param value - Finite numeric CSS value.
 * @returns Rounded decimal token.
 */
function formatCssNumber(value: number): string {
  return String(Math.round(value * 10_000) / 10_000);
}
