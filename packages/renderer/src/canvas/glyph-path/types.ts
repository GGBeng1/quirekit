import type {
  QuireGlyphRunGlyphPlacement,
  QuirePathSegment
} from "../../core/display-list";
import type {
  Canvas2DRenderTarget,
  CanvasGlyphRunFallbackReason
} from "../types";

/** Renderer-side path outline for one shaped glyph in renderer coordinate space. */
export interface CanvasGlyphPathOutline {
  /**
   * Path segments in glyph-local CSS-pixel coordinates.
   *
   * A font parser that reads outlines in font units must scale them before
   * returning this outline. The painter only translates these segments by the
   * shaped glyph placement.
   */
  readonly segments: readonly QuirePathSegment[];
}

/** Request used to resolve one renderer-side glyph path outline. */
export interface CanvasGlyphPathRequest {
  /** Shaped glyph id in the resolved font face. */
  readonly glyphId: number;
  /** CSS font shorthand used by the glyph-run fallback paint. */
  readonly font?: string;
  /** Optional loaded font identifier that shaped this glyph. */
  readonly fontId?: string;
  /** Optional CSS family name that shaped this glyph. */
  readonly fontFamily?: string;
}

/** Successful renderer-side glyph path resolution. */
export interface CanvasGlyphPathResolvedResolution {
  /** Resolution status discriminator. */
  readonly status: "resolved";
  /** Original glyph path request. */
  readonly request: CanvasGlyphPathRequest;
  /** Resolved glyph outline. */
  readonly outline: CanvasGlyphPathOutline;
}

/** Renderer-side glyph path fallback resolution. */
export interface CanvasGlyphPathFallbackResolution {
  /** Resolution status discriminator. */
  readonly status: "fallback";
  /** Original glyph path request. */
  readonly request: CanvasGlyphPathRequest;
  /** Specific reason the glyph path could not be resolved. */
  readonly reason: CanvasGlyphRunFallbackReason;
  /** Requested CSS family that failed source matching, when known. */
  readonly requestedFamily?: string;
  /** Loaded source family that was rejected, when known. */
  readonly loadedFamily?: string;
}

/** Result of trying to resolve one glyph outline. */
export type CanvasGlyphPathResolution =
  | CanvasGlyphPathResolvedResolution
  | CanvasGlyphPathFallbackResolution;

/** Renderer-side source for glyph path outlines. */
export interface CanvasGlyphPathSource {
  /**
   * Resolves a path outline for one shaped glyph.
   *
   * @param request - Glyph identity and optional font identity to resolve.
   * @returns Glyph path outline, or nullish when this source cannot resolve it.
   */
  getGlyphPath(
    request: CanvasGlyphPathRequest
  ): CanvasGlyphPathOutline | null | undefined;
  /**
   * Resolves a glyph outline with an explainable fallback reason.
   *
   * Sources may implement this richer route while keeping `getGlyphPath()` for
   * compatibility with older renderer integrations.
   *
   * @param request - Glyph identity and optional font identity to resolve.
   * @returns Resolved outline or a specific fallback reason.
   */
  resolveGlyphPath?(
    request: CanvasGlyphPathRequest
  ): CanvasGlyphPathResolution;
}

/** Target with the Canvas path APIs required by glyph path painting. */
export interface CanvasGlyphPathTarget extends Canvas2DRenderTarget {
  /** Begins a new path. */
  beginPath(): void;
  /**
   * Moves the current path point.
   *
   * @param x - Point x coordinate.
   * @param y - Point y coordinate.
   */
  moveTo(x: number, y: number): void;
  /**
   * Adds a line segment to the current path.
   *
   * @param x - Point x coordinate.
   * @param y - Point y coordinate.
   */
  lineTo(x: number, y: number): void;
  /**
   * Adds a quadratic curve to the current path.
   *
   * @param cpx - Control point x coordinate.
   * @param cpy - Control point y coordinate.
   * @param x - End point x coordinate.
   * @param y - End point y coordinate.
   */
  quadraticCurveTo(cpx: number, cpy: number, x: number, y: number): void;
  /**
   * Adds a bezier curve to the current path.
   *
   * @param cp1x - First control point x coordinate.
   * @param cp1y - First control point y coordinate.
   * @param cp2x - Second control point x coordinate.
   * @param cp2y - Second control point y coordinate.
   * @param x - End point x coordinate.
   * @param y - End point y coordinate.
   */
  bezierCurveTo(
    cp1x: number,
    cp1y: number,
    cp2x: number,
    cp2y: number,
    x: number,
    y: number
  ): void;
  /** Closes the current path. */
  closePath(): void;
  /** Fills the current path. */
  fill(): void;
}

/** Resolved outline paired with the glyph placement that owns it. */
export interface ResolvedCanvasGlyphPath {
  /** Glyph placement that owns the outline. */
  readonly glyph: QuireGlyphRunGlyphPlacement;
  /** Renderer path outline for the glyph. */
  readonly outline: CanvasGlyphPathOutline;
}
