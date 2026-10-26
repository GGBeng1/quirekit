import type {
  QuireMarkCanvasStyleResolver,
  QuireNodeCanvasTextStyleResolver
} from "@quirekit/core";
import type { Node as ProseMirrorNode } from "@quirekit/pm";
import { formatQuireFontFamily } from "@quirekit/layout/text";
import type { QuireParagraphFormatting } from "../../../document-profile/types";
import { resolveQuireMarkedFont } from "../font";

/**
 * Inputs needed to project paragraph-mark character formatting onto a marker.
 *
 * The projection only reads the textblock node, the inherited font, and the
 * mark-style resolver, so a textblock shaping request satisfies this contract
 * without the marker projection depending back on the shaping source module.
 */
export interface ResolveQuireNumberingMarkerTypographyOptions {
  /** Textblock whose first editable text child may own direct marks. */
  readonly node: ProseMirrorNode;
  /** Effective paragraph font before paragraph-mark direct formatting. */
  readonly font: string;
  /** Optional per-mark text-style resolver inherited from the owning view. */
  readonly resolveMarkQuireStyle?: QuireMarkCanvasStyleResolver | undefined;
}

/** Numbering marker typography inherited from the paragraph-mark character format. */
export interface QuireNumberingMarkerInheritanceTypography {
  /** Effective CSS font inherited by the generated marker. */
  readonly font: string;
  /** Marker text color; omitted when the marker stays inherited. */
  readonly textColor?: string | undefined;
  /** Marker text decorations; omitted when the marker inherits none. */
  readonly textDecoration?: readonly ("underline" | "line-through")[] | undefined;
}

/**
 * Resolves the effective character font inherited by a generated list marker.
 *
 * Word compiles numbering text from paragraph character formatting, including
 * the paragraph-mark character properties, before a numbering level applies
 * its own run-property delta. QuireKit does not yet store a distinct paragraph
 * mark, so the first editable text child's direct marks are the bounded
 * projection for non-empty paragraphs while the node style remains
 * authoritative for empty paragraphs.
 *
 * The result intentionally stays before script-slot itemization. A numeric or
 * symbolic marker must inherit the paragraph character formatting without
 * accidentally adopting a CJK family selected only for the first body glyph.
 *
 * @param options - Textblock node, inherited font, and mark-style resolver.
 * @param nodeStyle - Compiled node-level paragraph or heading text style.
 * @param markFormatting - Effective paragraph-mark typography, or null.
 * @returns Effective CSS font inherited by the generated marker.
 */
export function resolveQuireNumberingMarkerInheritanceTypography(
  options: ResolveQuireNumberingMarkerTypographyOptions,
  nodeStyle: ReturnType<NonNullable<QuireNodeCanvasTextStyleResolver>>,
  markFormatting: QuireParagraphFormatting["markTypography"]
): QuireNumberingMarkerInheritanceTypography {
  if (markFormatting !== null) {
    const base = resolveQuireMarkedFont(
      options.font,
      [],
      options.resolveMarkQuireStyle,
      nodeStyle
    );
    const decorations: ("underline" | "line-through")[] = [];
    if (markFormatting.underline === true) decorations.push("underline");
    if (markFormatting.strike === true) decorations.push("line-through");
    return {
      font: applyParagraphMarkFontFormatting(base, markFormatting),
      ...(markFormatting.color === null
        ? {}
        : { textColor: markFormatting.color }),
      ...(decorations.length === 0 ? {} : { textDecoration: decorations })
    };
  }

  // An empty paragraph owns no run, so the node style plus the paragraph-mark
  // font stay authoritative; a non-empty paragraph borrows its first text
  // child's direct marks as the bounded paragraph-mark projection.
  for (let index = 0; index < options.node.childCount; index += 1) {
    const child = options.node.child(index);
    if (!child.isText) continue;

    return {
      font: resolveQuireMarkedFont(
        options.font,
        child.marks,
        options.resolveMarkQuireStyle,
        nodeStyle
      )
    };
  }

  return {
    font: resolveQuireMarkedFont(
      options.font,
      [],
      options.resolveMarkQuireStyle,
      nodeStyle
    )
  };
}

/**
 * Applies paragraph-mark family, size, weight, and style to a CSS font shorthand.
 *
 * @param font - Effective paragraph font before paragraph-mark direct formatting.
 * @param formatting - Effective paragraph-mark typography.
 * @returns CSS font shorthand used as the numbering marker inheritance base.
 */
function applyParagraphMarkFontFormatting(
  font: string,
  formatting: NonNullable<QuireParagraphFormatting["markTypography"]>
): string {
  const sizeMatch = /\d+(?:\.\d+)?px(?:\/[^\s]+)?/u.exec(font);
  if (sizeMatch === null || sizeMatch.index === undefined) return font;
  let prefixes = font.slice(0, sizeMatch.index).trim().split(/\s+/u).filter(Boolean);
  if (formatting.bold !== null) {
    prefixes = prefixes.filter((token) => (
      !/^(?:normal|bold|bolder|lighter|[1-9]00)$/u.test(token)
    ));
  }
  if (formatting.italic !== null) {
    prefixes = prefixes.filter((token) => !/^(?:normal|italic|oblique)$/u.test(token));
  }
  if (formatting.italic === true) prefixes.unshift("italic");
  if (formatting.bold === true) prefixes.push("bold");
  const size = formatting.fontSize === null ? sizeMatch[0] : `${formatting.fontSize}px`;
  const inheritedFamily = font.slice(sizeMatch.index + sizeMatch[0].length).trim();
  const family = formatting.fontFamily === null
    ? inheritedFamily
    : formatQuireFontFamily(formatting.fontFamily);
  return `${prefixes.length === 0 ? "" : `${prefixes.join(" ")} `}${size} ${family}`;
}
