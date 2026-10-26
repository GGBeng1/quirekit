import type { Node as ProseMirrorNode } from "@quirekit/pm";
import type { QuireDocumentFontSet, QuireDocumentFontTable, QuireFontSelectionResolver, QuireMarkCanvasStyleResolver, QuireNodeCanvasTextStyle } from "@quirekit/core";
import type { QuireInlineTextRun } from "@quirekit/layout/inline";
import { resolveQuireMarkedFont } from "../font";
import { splitQuireDocumentFontRuns } from "../document-font-theme";

const fastProperties = new Set(["fontSize", "fontScale", "fontWeight", "fontStyle", "fontFamily", "lineHeightScale", "color", "documentFontRole", "documentOutlineLevel"]);

/**
 * Collects the common plain-text textblock case without visiting child nodes.
 *
 * Long paragraph repeat input normally produces one unmarked PM text child.
 * Avoiding `forEach` plus per-child mark resolution keeps the shared
 * `layout:collect` phase cheaper before full retained textblock records land.
 *
 * @param node - Textblock node to inspect.
 * @param contentStart - Absolute document position at the start of block content.
 * @param baseFont - Base font inherited by unmarked text.
 * @param resolveMarkStyle - Optional resolver for per-mark canvas style deltas.
 * @param nodeStyle - Optional base text style for the owning block node.
 * @param documentFontSet - Optional theme role used for Unicode font slots.
 * @param documentFontTable - Optional document alternate-name table.
 * @param resolveFontSelection - Optional document-owned run font selector.
 * @returns Itemized inline text runs, or null when the textblock is not simple.
 */
export function collectSingleUnmarkedInlineTextRuns(
  node: ProseMirrorNode,
  contentStart: number,
  baseFont: string,
  resolveMarkStyle?: QuireMarkCanvasStyleResolver,
  nodeStyle?: QuireNodeCanvasTextStyle | null,
  documentFontSet?: QuireDocumentFontSet,
  documentFontTable?: QuireDocumentFontTable,
  resolveFontSelection?: QuireFontSelectionResolver
): readonly QuireInlineTextRun[] | null {
  // The fast path is valid only when every inherited property it emits is modeled.
  if (Object.keys(nodeStyle ?? {}).some(key => !fastProperties.has(key))) return null;
  if (node.childCount !== 1) {
    return null;
  }

  const child = node.child(0);
  if (!child.isText || !child.text || child.marks.length > 0) {
    return null;
  }

  const font = resolveQuireMarkedFont(baseFont, [], resolveMarkStyle, nodeStyle);
  const resolveSlot = resolveFontSelection?.(nodeStyle ? [nodeStyle] : []);
  const themedRuns = documentFontSet === undefined && resolveSlot === undefined
    ? [{ from: 0, to: child.text.length, text: child.text, font }]
    : splitQuireDocumentFontRuns({
        text: child.text,
        font,
        fontSet: documentFontSet ?? {},
        resolveSlot,
        ...(documentFontTable === undefined ? {} : { fontTable: documentFontTable })
      });
  return themedRuns.map((run) => ({
    text: run.text,
    range: { from: contentStart + run.from, to: contentStart + run.to },
    font: run.font,
    ...(nodeStyle?.color === undefined ? {} : { color: nodeStyle.color }),
    marks: []
  }));
}
