import {
  normalizeQuireDocumentFontTable,
  normalizeQuireDocumentFontTheme,
  resolveQuireFontSubstitutionCandidates,
  type QuireDocumentFontTable,
  type QuireDocumentFontSet,
  type QuireDocumentFontTheme
} from "@quirekit/core";
import type { Node as ProseMirrorNode } from "@quirekit/pm";
import {
  formatQuireCssFontFamily,
  readQuireCssFontFamilies,
  replaceQuireCssFontFamilies,
  terminateQuireCssFontFamilies
} from "./css-font";

/** Document typography roles understood by renderer-neutral layout. */
export type QuireDocumentFontRole = "body" | "heading";

/**
 * Reads the normalized font theme carried by a canonical document node.
 *
 * @param documentNode - Canonical ProseMirror document node.
 * @returns Normalized document theme, or null when the attribute is absent.
 */
export function readQuireDocumentFontTheme(
  documentNode: ProseMirrorNode
): QuireDocumentFontTheme | null {
  return normalizeQuireDocumentFontTheme(documentNode.attrs.fontTheme);
}

/**
 * Reads the normalized document font-table projection carried by the root node.
 *
 * @param documentNode - Canonical ProseMirror document node.
 * @returns Normalized font table, or null when the attribute is absent.
 */
export function readQuireDocumentFontTable(
  documentNode: ProseMirrorNode
): QuireDocumentFontTable | null {
  return normalizeQuireDocumentFontTable(documentNode.attrs.fontTable);
}

/**
 * Resolves one font set from a canonical document typography role.
 *
 * @param theme - Normalized canonical document theme.
 * @param role - Body or heading theme role.
 * @returns Selected role, with heading falling back to body.
 */
export function resolveQuireDocumentFontSet(
  theme: QuireDocumentFontTheme,
  role: QuireDocumentFontRole = "body"
): QuireDocumentFontSet {
  return role === "heading" ? theme.heading ?? theme.body : theme.body;
}

/**
 * Resolves a CSS font shorthand for one canonical document typography role.
 *
 * @param documentNode - Canonical ProseMirror document node.
 * @param fallbackFont - Complete fallback CSS font shorthand.
 * @param role - Body or heading theme role.
 * @returns Font shorthand with the document families before engine fallbacks.
 */
export function resolveQuireDocumentFont(
  documentNode: ProseMirrorNode,
  fallbackFont: string,
  role: QuireDocumentFontRole = "body"
): string {
  const family = resolveQuireDocumentFontFamily(documentNode, fallbackFont, role);
  return family === null
    ? fallbackFont
    : replaceQuireCssFontFamilies(fallbackFont, parseFormattedFamilies(family));
}

/**
 * Resolves the ordered CSS family list for one document typography role.
 *
 * This combined list is retained for inherited HTML styles and diagnostics.
 * Canvas and SVG itemize canonical text into slot-specific runs before layout.
 *
 * @param documentNode - Canonical ProseMirror document node.
 * @param fallbackFont - Complete fallback CSS font shorthand.
 * @param role - Body or heading theme role.
 * @returns CSS family list, or null when the document has no font theme.
 */
export function resolveQuireDocumentFontFamily(
  documentNode: ProseMirrorNode,
  fallbackFont: string,
  role: QuireDocumentFontRole = "body"
): string | null {
  const theme = readQuireDocumentFontTheme(documentNode);
  if (theme === null) {
    return null;
  }
  const selected = resolveQuireDocumentFontSet(theme, role);
  const fontTable = readQuireDocumentFontTable(documentNode);
  const families = terminateQuireCssFontFamilies(uniqueFamilies([
    ...resolveDocumentFontCandidates(selected.latin, fontTable),
    ...resolveDocumentFontCandidates(selected.eastAsia, fontTable),
    ...resolveDocumentFontCandidates(selected.complexScript, fontTable),
    ...(selected.fallbacks ?? []),
    ...readQuireCssFontFamilies(fallbackFont)
  ]));
  return families.length === 0
    ? null
    : families.map(formatQuireCssFontFamily).join(", ");
}

/**
 * Resolves requested, document-alternate, and host-substitute family names.
 *
 * @param family - Logical family for one document script slot.
 * @param fontTable - Optional canonical document font table.
 * @returns Exact candidate family names in substitution order.
 */
function resolveDocumentFontCandidates(
  family: string | undefined,
  fontTable: QuireDocumentFontTable | null
): readonly string[] {
  return family === undefined
    ? []
    : resolveQuireFontSubstitutionCandidates({
        requestedFamily: family,
        fontTable
      }).map((candidate) => candidate.family);
}

/**
 * Deduplicates optional family names without changing precedence.
 *
 * @param families - Optional family names in precedence order.
 * @returns Trimmed unique family names.
 */
export function uniqueFamilies(
  families: readonly (string | undefined)[]
): readonly string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const value of families) {
    const family = value?.trim();
    const key = family?.toLocaleLowerCase("en-US");
    if (family === undefined || family.length === 0 || key === undefined || seen.has(key)) {
      continue;
    }
    seen.add(key);
    result.push(family);
  }
  return result;
}

/**
 * Parses a formatted family list by borrowing the complete-font parser.
 *
 * @param family - Formatted CSS family list.
 * @returns Unquoted family names.
 */
function parseFormattedFamilies(family: string): readonly string[] {
  return readQuireCssFontFamilies(`1px ${family}`);
}
