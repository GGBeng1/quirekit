import type { QuireGlyphRunCoverage } from "@quirekit/renderer";
import type {
  QuireShapedGlyphPlacement,
  QuireShapedTextCluster,
  QuireShapedTextRun,
  QuireTextMeasurer,
  QuireTextShapeContext,
  QuireTextMetrics
} from "../../text/types";
import { resolveQuireFontPixelSize } from "../font-size";
import {
  resolveQuireShapeFeatures,
  type QuireShapeRunOptionsResolver
} from "../measurer";
import { createQuireShapedRunCache, type QuireShapedRunCache } from "./cache";
import { appendQuireResolvedShape } from "./combine";
import {
  mergeQuireGlyphCoverage,
  mergeQuireShapedRunGlyphCoverage
} from "./coverage";
import { shapeTextWithFallbackMeasurer } from "./fallback-measurer";
import { normalizeResolvedShapeToVisualWidth } from "./normalize";
import type { QuireFontResolver } from "./types";

/** Default number of shaped runs cached by a resolver-backed measurer. */
const DEFAULT_SHAPED_RUN_CACHE_SIZE = 2_048;

/** Options for adapting a font resolver into a text measurer. */
export interface QuireFontResolverTextMeasurerOptions {
  /** Font resolver used to split text into concrete font runs. */
  readonly resolver: QuireFontResolver;
  /** Optional measurer used when no loaded font covers a text segment. */
  readonly fallbackMeasurer?: QuireTextMeasurer | undefined;
  /** Whether shaped width should be aligned to the fallback measurer's visual width. */
  readonly normalizeWidthToFallbackMeasurer?: boolean | undefined;
  /** Optional hook for direction, script, language, features, and size. */
  readonly resolveRunOptions?: QuireShapeRunOptionsResolver;
  /** Maximum shaped runs to cache; pass 0 to disable caching. */
  readonly cacheSize?: number | undefined;
}

/**
 * Creates a text measurer that shapes text through resolved fallback fonts.
 *
 * @param options - Font resolver and optional run metadata resolver.
 * @returns Text measurer compatible with the layout pipeline.
 */
export function createQuireTextMeasurerFromFontResolver(
  options: QuireFontResolverTextMeasurerOptions
): QuireTextMeasurer {
  const cache = options.cacheSize === 0
    ? null
    : createQuireShapedRunCache({
      maxEntries: options.cacheSize ?? DEFAULT_SHAPED_RUN_CACHE_SIZE
    });

  return {
    /**
     * Measures text by shaping resolved font runs.
     *
     * @param text - Text content to measure.
     * @param font - CSS font shorthand used for shaping.
     * @returns Text metrics including the shaped font ascent and descent.
     */
    measureText(text, font) {
      return measureTextWithResolvedFonts(text, font, options, cache);
    },
    /**
     * Shapes text by resolving fallback fonts first.
     *
     * @param text - Text content to shape.
     * @param font - CSS font shorthand used for shaping.
     * @param context - Per-run language and direction overrides.
     * @returns Cluster-based shaped text run.
     */
    shapeRun(text, font, context) {
      return shapeTextWithResolvedFonts(text, font, options, cache, context);
    }
  };
}

/**
 * Measures text by shaping resolved font runs.
 *
 * @param text - Text content to measure.
 * @param font - CSS font shorthand used for shaping.
 * @param options - Resolver measurer options.
 * @returns Text metrics including the shaped font ascent and descent.
 */
function measureTextWithResolvedFonts(
  text: string,
  font: string,
  options: QuireFontResolverTextMeasurerOptions,
  cache: QuireShapedRunCache | null
): QuireTextMetrics {
  // Shaping already resolves the font's ascent/descent; surface them so a line
  // box can grow to its tallest run instead of discarding them with width only.
  const shaped = shapeTextWithResolvedFonts(text, font, options, cache);

  return {
    width: shaped.width,
    ...(shaped.ascent === undefined ? {} : { ascent: shaped.ascent }),
    ...(shaped.descent === undefined ? {} : { descent: shaped.descent })
  };
}

/**
 * Shapes text by resolving each fallback font slice first.
 *
 * @param text - Text content to shape.
 * @param font - CSS font shorthand used for shaping.
 * @param options - Resolver measurer options.
 * @param cache - Optional shaped-run cache.
 * @param context - Per-run language and direction overrides.
 * @returns Combined shaped run.
 */
function shapeTextWithResolvedFonts(
  text: string,
  font: string,
  options: QuireFontResolverTextMeasurerOptions,
  cache: QuireShapedRunCache | null,
  context?: QuireTextShapeContext
): QuireShapedTextRun {
  const cached = cache?.get(text, font, context);

  if (cached) {
    return cached;
  }

  const resolvedRuns = options.resolver.resolveTextRuns(text, font);
  const clusters: QuireShapedTextCluster[] = [];
  const glyphs: QuireShapedGlyphPlacement[] = [];
  let width = 0;
  let ascent = 0;
  let descent = 0;
  let sourceCursor = 0;
  let glyphCoverage: QuireGlyphRunCoverage | undefined;

  for (const run of resolvedRuns) {
    if (run.from > sourceCursor) {
      const fallback = shapeTextWithFallbackMeasurer(
        text.slice(sourceCursor, run.from),
        font,
        options.fallbackMeasurer,
        context
      );

      ({ width, ascent, descent } = appendQuireResolvedShape({
        clusters,
        glyphs,
        shaped: fallback,
        sourceFrom: sourceCursor,
        width,
        ascent,
        descent
      }));
      glyphCoverage = mergeQuireGlyphCoverage(glyphCoverage, "partial");
    }

    const resolved = options.resolveRunOptions?.(run.text, font);
    const direction = context?.direction ?? resolved?.direction;
    const language = context?.language ?? resolved?.language;
    const features = resolveQuireShapeFeatures(
      resolved?.features,
      context?.disableOptionalLigatures === true
    );
    const shaped = run.font.shapeRun({
      text: run.text,
      font,
      size: resolved?.size ?? resolveQuireFontPixelSize(font),
      ...(direction === undefined ? {} : { direction }),
      ...(resolved?.script ? { script: resolved.script } : {}),
      ...(language === undefined ? {} : { language }),
      ...(features === undefined ? {} : { features })
    });

    ({ width, ascent, descent } = appendQuireResolvedShape({
      clusters,
      glyphs,
      shaped,
      sourceFrom: run.from,
      width,
      ascent,
      descent
    }));
    glyphCoverage = mergeQuireShapedRunGlyphCoverage(glyphCoverage, shaped);
    sourceCursor = run.to;
  }

  if (sourceCursor < text.length) {
    const fallback = shapeTextWithFallbackMeasurer(
      text.slice(sourceCursor),
      font,
      options.fallbackMeasurer,
      context
    );

    ({ width, ascent, descent } = appendQuireResolvedShape({
      clusters,
      glyphs,
      shaped: fallback,
      sourceFrom: sourceCursor,
      width,
      ascent,
      descent
    }));
    glyphCoverage = mergeQuireGlyphCoverage(glyphCoverage, "partial");
  }

  const shaped = normalizeResolvedShapeToVisualWidth({
    shaped: {
      clusters,
      width,
      ascent,
      descent,
      ...(glyphs.length > 0
        ? { glyphs, glyphCoverage: glyphCoverage ?? "partial" }
        : {})
    },
    text,
    font,
    enabled: options.normalizeWidthToFallbackMeasurer,
    fallbackMeasurer: options.fallbackMeasurer
  });

  cache?.set(text, font, shaped, context);

  return shaped;
}
