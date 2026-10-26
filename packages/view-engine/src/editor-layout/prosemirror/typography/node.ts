import type { QuireEditorState, QuireMarkCanvasStyleResolver, QuireNodeCanvasTextStyle, QuireNodeCanvasTextStyleResolver } from "@quirekit/core";
import { parseQuireFontPixelSize } from "@quirekit/layout/shaping";
import { resolveQuireCanvasFontSize } from "@quirekit/layout/text";
import { resolveQuireDocumentFontFamily } from "../document-font-theme";
import type { QuireNodeTextMetrics } from "./types";

/**
 * Builds a node base canvas-style resolver from the editor's extensions.
 *
 * @param state - Editor state whose extensions should be searched.
 * @param inheritedFont - Base font used to append engine fallbacks to heading themes.
 * @param applyDocumentTheme - Whether document heading families participate.
 * @returns Resolver mapping a node instance to its base canvas text style.
 */
export function createQuireNodeTextStyleResolver(
  state: QuireEditorState,
  inheritedFont?: string,
  applyDocumentTheme = inheritedFont !== undefined
): QuireNodeCanvasTextStyleResolver {
  const headingFamily = applyDocumentTheme && inheritedFont !== undefined
    ? resolveQuireDocumentFontFamily(state.doc, inheritedFont, "heading")
    : null;
  return (node) => {
    for (const extension of state.extensions) {
      const resolve = extension.canvasTextStyle?.[node.type.name];

      if (resolve) {
        const style = resolve(node);
        return resolveQuireDocumentFontRole(node.type.name, style) === "heading"
          && headingFamily !== null
          && style?.fontFamily === undefined
          ? { ...(style ?? {}), fontFamily: headingFamily }
          : style;
      }
    }

    return node.type.name === "heading" && headingFamily !== null
      ? { documentFontRole: "heading", fontFamily: headingFamily }
      : null;
  };
}

/**
 * Resolves one textblock's logical document-font role.
 *
 * The style-owned role is authoritative so behavior Extensions can give
 * paragraph-backed Word headings the same semantics as a dedicated heading
 * node. The node-name fallback preserves existing generic editor kits.
 *
 * @param nodeTypeName - Concrete ProseMirror node type name.
 * @param nodeStyle - Extension-owned node style, or null.
 * @returns Logical body or heading document-font role.
 */
export function resolveQuireDocumentFontRole(
  nodeTypeName: string,
  nodeStyle: QuireNodeCanvasTextStyle | null
): "body" | "heading" {
  return nodeStyle?.documentFontRole
    ?? (nodeTypeName === "heading" ? "heading" : "body");
}

/**
 * Derives block-scoped font and line metrics from a node's base text style.
 *
 * Natural line metrics follow the absolute size when supplied, otherwise the
 * relative font scale. A separate `lineHeightScale` remains explicit. Mark deltas compose on top of the
 * returned font via {@link resolveQuireMarkedFont}.
 *
 * @param baseFont - Inherited base CSS font shorthand.
 * @param baseLineHeight - Inherited base line height.
 * @param baseBaselineOffset - Inherited base baseline offset.
 * @param nodeStyle - Resolved node base text style, or null.
 * @returns Block-scoped text metrics.
 */
export function applyQuireNodeTextMetrics(
  baseFont: string,
  baseLineHeight: number,
  baseBaselineOffset: number,
  nodeStyle: QuireNodeCanvasTextStyle | null
): QuireNodeTextMetrics {
  if (!nodeStyle) {
    return {
      font: baseFont,
      lineHeight: baseLineHeight,
      baselineOffset: baseBaselineOffset,
      lineHeightMode: "minimum"
    };
  }

  const absolute = nodeStyle.fontSize === undefined ? null : resolveQuireCanvasFontSize(nodeStyle.fontSize);
  const baseSize = parseQuireFontPixelSize(baseFont);
  const followsFont = nodeStyle.lineHeightScale === undefined || nodeStyle.lineHeightScale === nodeStyle.fontScale;
  // Absolute CSS size owns natural metrics too; an imported relative scale may
  // have a different base. Keep independently requested line metrics explicit.
  const lineScale = absolute !== null && baseSize !== null && baseSize > 0 && followsFont
    ? Number.parseFloat(absolute) / baseSize
    : nodeStyle.lineHeightScale ?? nodeStyle.fontScale ?? 1;

  return {
    font: baseFont,
    lineHeight: baseLineHeight * lineScale,
    baselineOffset: baseBaselineOffset * lineScale,
    lineHeightMode: "minimum"
  };
}

/**
 * Builds a mark canvas-style resolver from the editor's extensions.
 *
 * Finds the `canvasStyle` resolver an extension contributed for a mark's type
 * name and applies it. Returns null when
 * no extension styles the mark, so the legacy font handling can take over during
 * the migration.
 *
 * @param state - Editor state whose extensions should be searched.
 * @returns Resolver mapping a mark instance to its canvas style delta.
 */
export function createQuireMarkStyleResolver(
  state: QuireEditorState
): QuireMarkCanvasStyleResolver {
  return (mark, context) => {
    for (const extension of state.extensions) {
      const resolve = extension.canvasStyle?.[mark.type.name];

      if (resolve) {
        return resolve(mark, context === undefined ? undefined : { ...context, document: state.doc });
      }
    }

    return null;
  };
}
