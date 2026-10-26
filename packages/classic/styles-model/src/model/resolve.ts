import { mergeWordStyleText } from "./text/merge";
import type { QuireNodeCanvasTextStyle } from "@quirekit/core";
import {
  defaultWordParagraphFormatting,
  type WordParagraphFormatting
} from "@quirekit/classic-paragraph-model";
import { mergeWordParagraphFormatting } from "./merge";
import type {
  ResolvedWordNamedParagraphStyle,
  ResolvedWordParagraphAppearance,
  ResolvedWordStyleNumbering,
  WordNamedParagraphStyle,
  WordParagraphStyleDiagnostic,
  WordParagraphStyleRegistry,
  WordTableStyleTextLayer
} from "./types";

/**
 * Resolves a named paragraph style through its complete `basedOn` chain.
 *
 * Missing references and cycles are recoverable: all safely visited ancestors
 * still contribute, and diagnostics are returned for import/product reporting.
 *
 * @param registry - Valid document paragraph style registry.
 * @param styleId - Requested style identifier, or null for the registry default.
 * @param tableLayer - Table-style layer for paragraphs inside a styled table cell.
 * @returns Effective paragraph/text properties and inheritance diagnostics.
 */
export function resolveWordNamedParagraphStyle(
  registry: WordParagraphStyleRegistry,
  styleId: string | null,
  tableLayer?: WordTableStyleTextLayer
): ResolvedWordNamedParagraphStyle {
  // Layout resolves every paragraph per frame; the registry is an immutable document attribute.
  // Table-cell layers are rebuilt per query, so only plain paragraphs share results.
  if (tableLayer !== undefined) return resolveNamedParagraphStyleChain(registry, styleId, tableLayer);
  let byStyle = namedStyles.get(registry);
  if (byStyle === undefined) namedStyles.set(registry, byStyle = new Map());
  let resolved = byStyle.get(styleId);
  if (resolved === undefined) {
    resolved = Object.freeze(resolveNamedParagraphStyleChain(registry, styleId));
    byStyle.set(styleId, resolved);
  }
  return resolved;
}

/** Shared named-style results per registry and style id. */
const namedStyles = new WeakMap<WordParagraphStyleRegistry, Map<string | null, ResolvedWordNamedParagraphStyle>>();

/**
 * Resolves the named style chain without consulting the cache.
 *
 * @param registry - Valid document paragraph style registry.
 * @param styleId - Requested style identifier, or null for the registry default.
 * @param tableLayer - Table-style layer for paragraphs inside a styled table cell.
 * @returns Effective paragraph/text properties and inheritance diagnostics.
 */
function resolveNamedParagraphStyleChain(
  registry: WordParagraphStyleRegistry,
  styleId: string | null,
  tableLayer?: WordTableStyleTextLayer
): ResolvedWordNamedParagraphStyle {
  const requestedId = styleId ?? registry.defaultParagraphStyleId;
  const diagnostics: WordParagraphStyleDiagnostic[] = [];
  const requested = registry.styles[requestedId]
    ?? registry.styles[registry.defaultParagraphStyleId]
    ?? firstStyle(registry);

  if (registry.styles[requestedId] === undefined) {
    diagnostics.push({
      kind: "missing-style",
      styleId: requestedId,
      message: `Missing Word paragraph style: ${requestedId}`
    });
  }

  const leafToRoot: WordNamedParagraphStyle[] = [];
  const visited = new Set<string>();
  let cursor: WordNamedParagraphStyle | undefined = requested;

  // Phase 1 walks identity references only, stopping before a repeated edge so
  // inheritance can never recurse indefinitely on malformed imported styles.
  while (cursor !== undefined) {
    if (visited.has(cursor.id)) {
      diagnostics.push({
        kind: "inheritance-cycle",
        styleId: cursor.id,
        message: `Word paragraph style inheritance cycle at: ${cursor.id}`
      });
      break;
    }
    visited.add(cursor.id);
    leafToRoot.push(cursor);
    if (cursor.basedOn === null) break;
    const base: WordNamedParagraphStyle | undefined =
      registry.styles[cursor.basedOn];
    if (base === undefined) {
      diagnostics.push({
        kind: "missing-base",
        styleId: cursor.id,
        message: `Missing base style ${cursor.basedOn} for ${cursor.id}`
      });
      break;
    }
    cursor = base;
  }

  // Phase 2 applies ancestors before descendants. Each style is a delta and
  // unspecified properties inherit; this is the same invariant used by OOXML.
  let paragraph = mergeWordParagraphFormatting(
    mergeWordParagraphFormatting(defaultWordParagraphFormatting, registry.paragraphDefaults ?? {}),
    tableLayer?.paragraph ?? {}
  );
  let text: QuireNodeCanvasTextStyle = mergeWordStyleText(mergeWordStyleText({}, registry.textDefaults ?? {}), tableLayer?.text ?? {});
  const chain = leafToRoot.reverse();
  for (const style of chain) {
    const yielded = style.id === registry.defaultParagraphStyleId && tableLayer !== undefined
      ? yieldDefaultStyleToTable(style, tableLayer)
      : style;
    paragraph = mergeWordParagraphFormatting(paragraph, yielded.paragraph);
    // A relative size explicitly declared by a child replaces an inherited
    // absolute size; a child with no size continues to inherit both forms.
    if (yielded.text.fontScale !== undefined && yielded.text.fontSize === undefined) {
      const { fontSize: _inheritedSize, ...retained } = text;
      text = retained;
    }
    text = mergeWordStyleText(text, yielded.text);
  }

  return {
    style: requested,
    inheritanceChain: chain.map((style) => style.id),
    paragraph,
    text,
    numbering: resolveStyleChainNumbering(chain),
    diagnostics
  };
}

/**
 * Drops default-style font size and start alignment where a table style sets
 * them, following Word's default for `overrideTableStyleFontSizeAndJustification`.
 *
 * @param style - Default paragraph style.
 * @param tableLayer - Table-style layer of the cell.
 * @returns Style delta that no longer overrides those table-style values.
 */
function yieldDefaultStyleToTable(
  style: WordNamedParagraphStyle,
  tableLayer: WordTableStyleTextLayer
): WordNamedParagraphStyle {
  const text = { ...style.text };
  if (tableLayer.text?.fontScale !== undefined || tableLayer.text?.fontSize !== undefined) {
    delete text.fontSize;
    delete text.fontScale;
    delete text.lineHeightScale;
  }
  const alignment = style.paragraph.alignment;
  const yieldsAlignment = alignment === "start"
    && tableLayer.paragraph?.alignment !== undefined && tableLayer.paragraph.alignment !== null;
  return {
    ...style,
    text,
    paragraph: yieldsAlignment ? { ...style.paragraph, alignment: undefined } : style.paragraph
  };
}

/**
 * Resolves style numbering root to leaf with independently inherited fields.
 *
 * @param chain - Base-to-leaf style definitions.
 * @returns Effective numbering, or null when absent or removed with `numId="0"`.
 */
function resolveStyleChainNumbering(
  chain: readonly WordNamedParagraphStyle[]
): ResolvedWordStyleNumbering | null {
  let numId: string | null = null;
  let level: number | null = null;
  let sourceStyleId: string | null = null;
  for (const style of chain) {
    const numbering = style.numbering;
    if (numbering === undefined || numbering === null) continue;
    if (numbering.numId !== null) numId = numbering.numId;
    if (numbering.level !== null) level = numbering.level;
    sourceStyleId = style.id;
  }
  return numId === null || numId === "0" || sourceStyleId === null
    ? null
    : { numId, level: level ?? 0, sourceStyleId };
}

/**
 * Resolves named-style inheritance and then applies paragraph-local formatting.
 *
 * @param registry - Valid document paragraph style registry.
 * @param directFormatting - Canonical paragraph-local formatting.
 * @param tableLayer - Table-style layer for paragraphs inside a styled table cell.
 * @returns Effective paragraph appearance with direct formatting winning.
 */
export function resolveWordParagraphAppearance(
  registry: WordParagraphStyleRegistry,
  directFormatting: WordParagraphFormatting,
  tableLayer?: WordTableStyleTextLayer
): ResolvedWordParagraphAppearance {
  const namedStyle = resolveWordNamedParagraphStyle(
    registry,
    directFormatting.styleId,
    tableLayer
  );
  return {
    namedStyle,
    paragraph: mergeWordParagraphFormatting(
      namedStyle.paragraph,
      directFormatting
    ),
    text: namedStyle.text
  };
}

/**
 * Returns the first registry style as a final defensive fallback.
 *
 * @param registry - Valid non-empty registry.
 * @returns First style definition.
 */
function firstStyle(
  registry: WordParagraphStyleRegistry
): WordNamedParagraphStyle {
  const style = Object.values(registry.styles)[0];
  if (style === undefined) {
    throw new Error("Word paragraph style registry must contain one style.");
  }
  return style;
}

/**
 * Resolves a paragraph inside a styled table cell, with or without a
 * paragraph-style registry. Without one, the table layer sits directly between
 * the built-in defaults and the paragraph's direct formatting.
 *
 * @param registry - Paragraph style registry, or null when none is installed.
 * @param directFormatting - Canonical paragraph-local formatting.
 * @param tableLayer - Table-style layer of the containing cell.
 * @returns Effective paragraph formatting and text delta.
 */
export function resolveWordTableCellParagraphAppearance(
  registry: WordParagraphStyleRegistry | null,
  directFormatting: WordParagraphFormatting,
  tableLayer: WordTableStyleTextLayer
): Pick<ResolvedWordParagraphAppearance, "paragraph" | "text"> {
  if (registry !== null) return resolveWordParagraphAppearance(registry, directFormatting, tableLayer);
  return {
    paragraph: mergeWordParagraphFormatting(
      mergeWordParagraphFormatting(defaultWordParagraphFormatting, tableLayer.paragraph ?? {}),
      directFormatting
    ),
    text: mergeWordStyleText({}, tableLayer.text ?? {})
  };
}
