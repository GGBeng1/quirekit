import type {
  QuireCaretCommand,
  QuireClipCommand,
  QuireFillRectCommand,
  QuireGlyphRunCommand,
  QuireImageCommand,
  QuireLineCommand,
  QuirePathCommand,
  QuireTextCommand
} from "../display-list";

/** Renderer-neutral drawing surface implemented by canvas adapters. */
export interface QuireDrawSurface {
  /**
   * Fills a rectangle.
   *
   * @param command - Fill rectangle command to draw.
   */
  fillRect(command: QuireFillRectCommand | QuireCaretCommand): void;
  /**
   * Fills text.
   *
   * @param command - Text command to draw.
   */
  fillText(command: QuireTextCommand): void;
  /**
   * Fills a shaped glyph run.
   *
   * @param command - Glyph-run command to draw.
   */
  fillGlyphRun(command: QuireGlyphRunCommand): void;
  /**
   * Strokes a line.
   *
   * @param command - Line command to draw.
   */
  strokeLine(command: QuireLineCommand): void;
  /**
   * Draws a filled or stroked path.
   *
   * @param command - Path command to draw.
   */
  drawPath(command: QuirePathCommand): void;
  /**
   * Draws an image.
   *
   * @param command - Image command to draw.
   */
  drawImage(command: QuireImageCommand): void;
  /**
   * Clips drawing to a command rectangle while running a callback.
   *
   * @param command - Clip command that owns the clip rectangle.
   * @param draw - Drawing callback to run inside the clip.
   */
  withClip(command: QuireClipCommand, draw: () => void): void;
}
