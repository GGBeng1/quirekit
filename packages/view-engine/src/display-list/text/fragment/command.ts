import type {
  QuireDocumentRange,
  QuireGlyphRunCommand,
  QuireGlyphRunGlyphPlacement,
  QuireTextCommand
} from "@quirekit/renderer";
import type { QuireLayoutNode } from "../../../layout";
import type { QuireTextFragment } from "@quirekit/layout/text";

/** Options for creating a fragment text paint command. */
export interface QuireTextFragmentCommandOptions {
  /** Stable command id. */
  readonly id: string;
  /** Text fragment to paint. */
  readonly fragment: QuireTextFragment;
  /** Optional document sub-range represented by this command. */
  readonly range?: QuireDocumentRange | undefined;
  /** Optional text content when painting a fragment slice. */
  readonly text?: string | undefined;
  /** Optional x offset from the fragment left edge. */
  readonly localX?: number | undefined;
  /** Optional segment width. */
  readonly width?: number | undefined;
  /** Optional glyph placements when painting a fragment slice. */
  readonly glyphs?: readonly QuireGlyphRunGlyphPlacement[] | undefined;
  /** Fill style for the text paint command. */
  readonly fillStyle: string;
}

/**
 * Creates a text paint command for a measured text fragment.
 *
 * @param options - Command id, fragment, and fill style.
 * @returns Glyph-run command when shaped glyphs exist, otherwise a text command.
 */
export function createTextFragmentCommand(
  options: QuireTextFragmentCommandOptions
): QuireTextCommand | QuireGlyphRunCommand {
  const range = options.range ?? options.fragment.range;
  const text = options.fragment.tab?.text ?? options.text ?? options.fragment.text;
  const localX = options.localX ?? 0;
  const width = options.width ?? options.fragment.rect.width;
  const base = {
    id: options.id,
    range,
    rect: {
      ...options.fragment.rect,
      x: options.fragment.rect.x + localX,
      width
    },
    text,
    origin: {
      x: options.fragment.rect.x + localX + (options.fragment.tab?.offset ?? 0)
        + (localX === 0 ? options.fragment.paintOffset ?? 0 : 0),
      y: options.fragment.baseline
    },
    font: options.fragment.font,
    ...(options.fragment.trailingSpacing === undefined || range.to !== options.fragment.range.to
      ? {} : { trailingSpacing: options.fragment.trailingSpacing }),
    ...(options.fragment.horizontalScale === undefined ? {} : { horizontalScale: options.fragment.horizontalScale }),
    ...(options.fragment.letterSpacing === undefined
      ? {}
      : { letterSpacing: options.fragment.letterSpacing }),
    fillStyle: options.fillStyle,
    ...(options.fragment.direction === undefined
      ? {}
      : { direction: options.fragment.direction })
  };
  const glyphs = options.glyphs ?? mapFragmentGlyphs(options.fragment);

  return glyphs.length > 0
    ? {
        ...base,
        kind: "glyph-run",
        glyphCoverage: options.fragment.shapedRun?.glyphCoverage ?? "partial",
        glyphs
      } satisfies QuireGlyphRunCommand
    : {
        ...base,
        kind: "text"
      } satisfies QuireTextCommand;
}

/**
 * Creates the base command id for a text fragment.
 *
 * @param node - Layout node that owns the fragment.
 * @param index - Fragment index within the node.
 * @returns Stable base command id.
 */
export function createFragmentCommandId(
  node: QuireLayoutNode,
  index: number
): string {
  return index === 0 ? `${node.id}:text` : `${node.id}:text-${index}`;
}

/**
 * Maps fragment shaped glyphs to display-list glyph placements.
 *
 * @param fragment - Fragment whose shaped glyph metadata should be mapped.
 * @returns Display-list glyph placements.
 */
export function mapFragmentGlyphs(
  fragment: QuireTextFragment
): readonly QuireGlyphRunGlyphPlacement[] {
  return fragment.shapedRun?.glyphs ?? [];
}
