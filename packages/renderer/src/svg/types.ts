import type {
  QuireDisplayList,
  QuireGlyphRunCommand
} from "../core/display-list";
import type { QuireRect } from "../core/geometry";
import type { QuireLayoutDomOverlay } from "../core/overlay";

/** Options used to serialize a display list into deterministic SVG markup. */
export interface SvgSerializeOptions {
  /** Display list whose commands should be represented as SVG elements. */
  readonly displayList: QuireDisplayList;
  /** Optional DOM overlays to serialize as SVG foreignObject nodes. */
  readonly domOverlays?: readonly QuireLayoutDomOverlay[];
  /** Optional viewport rectangle used to bound serialized commands. */
  readonly viewportRect?: QuireRect;
}

/** Options used to synchronize a display list into an SVG element. */
export interface SvgSyncOptions {
  /** SVG host element that should receive synchronized children. */
  readonly host: SVGSVGElement;
  /** Display list whose commands should be represented by SVG nodes. */
  readonly displayList: QuireDisplayList;
  /** Optional DOM overlays to host through foreignObject nodes. */
  readonly domOverlays?: readonly QuireLayoutDomOverlay[];
  /** Optional viewport rectangle used to bound live SVG nodes. */
  readonly viewportRect?: QuireRect;
  /** Whether the display list has already been filtered to the viewport rectangle. */
  readonly displayListIsViewportScoped?: boolean | undefined;
  /** Optional renderer that can take over live SVG glyph-run nodes. */
  readonly glyphRunRenderer?: SvgGlyphRunRenderer;
}

/** Context supplied to a live SVG glyph-run renderer. */
export interface SvgGlyphRunRenderContext {
  /** Owner document used to create SVG nodes. */
  readonly document: Document;
  /** Definition element available for reusable glyph resources. */
  readonly defs: SVGElement;
}

/** Optional renderer that can take over live SVG glyph-run output. */
export interface SvgGlyphRunRenderer {
  /**
   * Renders one shaped glyph run into live SVG nodes.
   *
   * @param command - Glyph-run display command to render.
   * @param context - SVG document and defs context.
   * @returns Custom SVG node or nodes; return null for fallback text output.
   */
  renderGlyphRun(
    command: QuireGlyphRunCommand,
    context: SvgGlyphRunRenderContext
  ): SVGElement | readonly SVGElement[] | null;
}

/** Options used to create an SVG-backed draw surface. */
export interface SvgDrawSurfaceOptions {
  /** SVG parent element that receives draw commands. */
  readonly parent: SVGElement;
  /** Optional SVG defs element that receives clip paths. */
  readonly defs?: SVGElement;
  /** Optional renderer that can take over live SVG glyph-run nodes. */
  readonly glyphRunRenderer?: SvgGlyphRunRenderer;
}
