import type { QuireDocumentFontTheme } from "@quirekit/core";
import type { Node } from "@quirekit/pm";
import type { ResolvedWordNumberingMarker } from "../types";

/** Effective text-fragment typography for one generated numbering marker. */
export interface WordNumberingMarkerTypography {
  /** Portable display text; canonical source text remains on the marker model. */
  readonly text: string;
  /** CSS font shorthand shared by marker measurement and paint. */
  readonly font: string;
  /** Explicit glyph color, omitted for inherited/auto color. */
  readonly textColor?: string;
  /** Simple decoration lines supported by the shared fragment contract. */
  readonly textDecoration?: readonly ("underline" | "line-through")[];
  /** Explicit marker font size in CSS pixels, when the numbering level sets one. */
  readonly explicitFontSize?: number | undefined;
}

/** Paragraph-owned typography inherited before numbering-level overrides. */
export interface WordNumberingMarkerInheritanceTypography {
  /** Direct paragraph-mark color, omitted for inherited or automatic color. */
  readonly textColor?: string | undefined;
  /** Direct paragraph-mark decoration lines. */
  readonly textDecoration?: readonly ("underline" | "line-through")[] | undefined;
}

/**
 * Word list-marker semantics shaped for a layout engine's paragraph model.
 *
 * The shape is structural so this package stays independent of any engine;
 * `@quirekit/classic-layout` registers it with the canvas engine.
 */
export interface WordNumberingModelSemantics {
  /** Resolves list markers keyed by paragraph position. */
  readonly listMarkers: (doc: Node) => ReadonlyMap<number, ResolvedWordNumberingMarker>;
  /** Resolves the tab stop after a marker ending at `end` CSS pixels on the logical axis. */
  readonly markerTab: (marker: unknown, end: number, characterPitch: number) =>
    { readonly position: number; readonly defaultGrid: boolean };
  /** Resolves marker typography from the paragraph font and paragraph-mark paint. */
  readonly markerTypography: (marker: unknown, bodyFont: string, theme: QuireDocumentFontTheme | undefined,
    inheritance: WordNumberingMarkerInheritanceTypography) => WordNumberingMarkerTypography;
  /** Resolves the menu or task-toggle interaction for a marker's paragraph range. */
  readonly markerTarget: (marker: unknown, range: { readonly from: number; readonly to: number }) => {
    readonly handler: string;
    readonly payload: unknown;
    readonly owner: { readonly id: string; readonly name: string; readonly metadata: Readonly<Record<string, unknown>> };
  };
  /** Reports whether a textblock is a checked task. */
  readonly isCheckedTask: (textblock: Node) => boolean;
}
