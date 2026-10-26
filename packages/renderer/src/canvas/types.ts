import type {
  QuireDisplayList,
  QuireGlyphRunCommand
} from "../core/display-list";

/** Renderer route that declined a glyph-run command and used native fallback. */
export type CanvasGlyphRunFallbackRoute = "glyph-path";

/** Reason a glyph-run renderer route fell back to native text paint. */
export type CanvasGlyphRunFallbackReason =
  | "glyph-path-coverage-partial"
  | "glyph-path-font-family-mismatch"
  | "glyph-path-font-id-missing"
  | "glyph-path-font-not-loaded"
  | "glyph-path-outline-missing"
  | "glyph-path-outline-provider-missing"
  | "glyph-path-run-empty"
  | "glyph-path-target-unsupported";

/** Diagnostic emitted when a glyph-run painter declines exact rendering. */
export interface CanvasGlyphRunFallbackDiagnostic {
  /** Renderer route that attempted to handle the glyph run. */
  readonly route: CanvasGlyphRunFallbackRoute;
  /** Specific fallback reason reported by the route. */
  readonly reason: CanvasGlyphRunFallbackReason;
  /** Display command id that fell back. */
  readonly commandId: string;
  /** Original text content painted through the native fallback. */
  readonly text: string;
  /** CSS font shorthand used by the fallback text paint. */
  readonly font?: string;
  /** Glyph id that caused the fallback, when the route reached one glyph. */
  readonly glyphId?: number;
  /** Loaded font id attached to the glyph, when available. */
  readonly fontId?: string;
  /** CSS font family attached to the glyph, when available. */
  readonly fontFamily?: string;
  /** Requested CSS family that failed source matching, when known. */
  readonly requestedFamily?: string;
  /** Loaded source family that was rejected, when known. */
  readonly loadedFamily?: string;
}

/** Receives glyph-run fallback diagnostics during Canvas rendering. */
export type CanvasGlyphRunFallbackReporter = (
  diagnostic: CanvasGlyphRunFallbackDiagnostic
) => void;

/** Minimal Canvas 2D-like target consumed by the renderer adapter. */
export interface Canvas2DRenderTarget {
  /** Fill style used by subsequent fill operations. */
  fillStyle: CanvasRenderingContext2D["fillStyle"];
  /** Font used by subsequent text operations. */
  font: string;
  /** Global alpha multiplier used by subsequent paint operations. */
  globalAlpha?: number;
  /** Stroke style used by subsequent stroke operations. */
  strokeStyle?: CanvasRenderingContext2D["strokeStyle"];
  /** Line width used by subsequent stroke operations. */
  lineWidth?: number;
  /** Line cap used by subsequent stroke operations. */
  lineCap?: CanvasLineCap;
  /** CSS character spacing used by subsequent native text operations. */
  letterSpacing?: string;
  /**
   * Clears a rectangle from the target.
   *
   * @param x - Rectangle x coordinate.
   * @param y - Rectangle y coordinate.
   * @param width - Rectangle width.
   * @param height - Rectangle height.
   */
  clearRect(x: number, y: number, width: number, height: number): void;
  /**
   * Fills a rectangle on the target.
   *
   * @param x - Rectangle x coordinate.
   * @param y - Rectangle y coordinate.
   * @param width - Rectangle width.
   * @param height - Rectangle height.
   */
  fillRect(x: number, y: number, width: number, height: number): void;
  /**
   * Fills text on the target.
   *
   * @param text - Text content to draw.
   * @param x - Text x coordinate.
   * @param y - Text baseline y coordinate.
   */
  fillText(text: string, x: number, y: number): void;
  /**
   * Strokes text without filling its interior.
   *
   * @param text - Text content to draw.
   * @param x - Text x coordinate.
   * @param y - Text baseline y coordinate.
   */
  strokeText?(text: string, x: number, y: number): void;
  /** Saves the current drawing state. */
  save?(): void;
  /** Restores the current drawing state. */
  restore?(): void;
  /**
   * Multiplies the current drawing transform by one affine matrix.
   *
   * @param a - Horizontal scale and x-axis rotation coefficient.
   * @param b - Vertical skew and x-axis rotation coefficient.
   * @param c - Horizontal skew and y-axis rotation coefficient.
   * @param d - Vertical scale and y-axis rotation coefficient.
   * @param e - Horizontal translation.
   * @param f - Vertical translation.
   */
  transform?(
    a: number,
    b: number,
    c: number,
    d: number,
    e: number,
    f: number
  ): void;
  /** Begins a new path. */
  beginPath?(): void;
  /**
   * Moves the current path point.
   *
   * @param x - Point x coordinate.
   * @param y - Point y coordinate.
   */
  moveTo?(x: number, y: number): void;
  /**
   * Adds a line segment to the current path.
   *
   * @param x - Point x coordinate.
   * @param y - Point y coordinate.
   */
  lineTo?(x: number, y: number): void;
  /**
   * Adds a quadratic curve to the current path.
   *
   * @param cpx - Control point x coordinate.
   * @param cpy - Control point y coordinate.
   * @param x - End point x coordinate.
   * @param y - End point y coordinate.
   */
  quadraticCurveTo?(cpx: number, cpy: number, x: number, y: number): void;
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
  bezierCurveTo?(
    cp1x: number,
    cp1y: number,
    cp2x: number,
    cp2y: number,
    x: number,
    y: number
  ): void;
  /** Closes the current path. */
  closePath?(): void;
  /**
   * Adds a rectangle to the current path.
   *
   * @param x - Rectangle x coordinate.
   * @param y - Rectangle y coordinate.
   * @param width - Rectangle width.
   * @param height - Rectangle height.
   */
  rect?(x: number, y: number, width: number, height: number): void;
  /** Clips subsequent drawing to the current path. */
  clip?(): void;
  /** Strokes the current path. */
  stroke?(): void;
  /**
   * Sets the dash pattern for subsequent strokes.
   *
   * @param segments - Dash and gap lengths in canvas coordinate space.
   */
  setLineDash?(segments: readonly number[]): void;
  /** Fills the current path. */
  fill?(): void;
  /** Optional Canvas-compatible image draw operation. */
  drawImage?: Canvas2DDrawImage;
}

/** Canvas-compatible image draw overloads required by the renderer. */
export interface Canvas2DDrawImage {
  /**
   * Draws a complete image source into a destination rectangle.
   *
   * @param image - Image source to draw.
   * @param dx - Destination x coordinate.
   * @param dy - Destination y coordinate.
   * @param dWidth - Destination width.
   * @param dHeight - Destination height.
   */
  (
    image: CanvasImageSource,
    dx: number,
    dy: number,
    dWidth: number,
    dHeight: number
  ): void;
  /**
   * Draws a cropped image source into a destination rectangle.
   *
   * @param image - Image source to draw.
   * @param sx - Source x coordinate.
   * @param sy - Source y coordinate.
   * @param sWidth - Source width.
   * @param sHeight - Source height.
   * @param dx - Destination x coordinate.
   * @param dy - Destination y coordinate.
   * @param dWidth - Destination width.
   * @param dHeight - Destination height.
   */
  (
    image: CanvasImageSource,
    sx: number,
    sy: number,
    sWidth: number,
    sHeight: number,
    dx: number,
    dy: number,
    dWidth: number,
    dHeight: number
  ): void;
}

/** Context supplied to a Canvas glyph-run painter. */
export interface CanvasGlyphRunPaintContext {
  /** Canvas 2D-like target receiving the glyph-run paint. */
  readonly target: Canvas2DRenderTarget;
  /** Optional sink for renderer fallback diagnostics. */
  readonly reportGlyphRunFallback?: CanvasGlyphRunFallbackReporter;
}

/** Optional painter that can take over Canvas glyph-run rendering. */
export interface CanvasGlyphRunPainter {
  /**
   * Paints one shaped glyph run.
   *
   * @param command - Glyph-run display command to paint.
   * @param context - Target context exposed by the Canvas adapter.
   * @returns Whether the painter fully handled the command.
   */
  paintGlyphRun(
    command: QuireGlyphRunCommand,
    context: CanvasGlyphRunPaintContext
  ): boolean;
}

/** Options used to create a Canvas 2D draw surface. */
export interface Canvas2DDrawSurfaceOptions {
  /** Optional painter that can take over glyph-run commands. */
  readonly glyphRunPainter?: CanvasGlyphRunPainter;
  /** Optional observer for glyph-run fallback diagnostics. */
  readonly onGlyphRunFallback?: CanvasGlyphRunFallbackReporter;
}

/** Options used to render a display list to a Canvas 2D-like target. */
export interface Canvas2DRenderOptions {
  /** Display list whose commands should be painted. */
  readonly displayList: QuireDisplayList;
  /** Canvas 2D-like target that receives paint commands. */
  readonly target: Canvas2DRenderTarget;
  /** Optional painter that can take over glyph-run commands. */
  readonly glyphRunPainter?: CanvasGlyphRunPainter;
  /** Optional observer for glyph-run fallback diagnostics. */
  readonly onGlyphRunFallback?: CanvasGlyphRunFallbackReporter;
}
