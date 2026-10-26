import { shapeQuireTextRun } from "../text/shape";
import type {
  QuireShapedTextRun,
  QuireTextShapeContext,
  QuireTextMeasurer,
  QuireTextMetrics
} from "../text/types";
import { resolveQuireFontPixelSize } from "./font-size";
import type {
  QuireLoadedShaperFont,
  QuireOpenTypeFeature,
  QuireShapeRunOptions
} from "./types";

const optionalLigatureTags = ["liga", "clig", "dlig", "hlig"] as const;

/**
 * Resolves additional shape options from a layout font token.
 *
 * @param text - Text content to shape.
 * @param font - CSS font shorthand.
 * @returns Partial shape options supplied by the caller.
 */
export type QuireShapeRunOptionsResolver = (
  text: string,
  font: string
) => Partial<Omit<QuireShapeRunOptions, "text" | "font" | "size">> & {
  /** Optional explicit CSS pixel font size. */
  readonly size?: number;
};

/** Options for adapting a loaded shaper font to the current measurer contract. */
export interface QuireShaperTextMeasurerOptions {
  /** Loaded shaper font used for synchronous shaping. */
  readonly font: QuireLoadedShaperFont;
  /** Width-only fallback used when the shaper cannot handle a run. */
  readonly fallbackMeasurer?: QuireTextMeasurer;
  /** Optional hook for direction, script, language, features, and size. */
  readonly resolveRunOptions?: QuireShapeRunOptionsResolver;
}

/**
 * Creates a `QuireTextMeasurer` backed by a loaded shaping font.
 *
 * @param options - Loaded font, fallback measurer, and run option resolver.
 * @returns Text measurer compatible with the existing layout pipeline.
 */
export function createQuireTextMeasurerFromShaper(
  options: QuireShaperTextMeasurerOptions
): QuireTextMeasurer {
  return {
    /**
     * Measures text by shaping it first.
     *
     * @param text - Text content to measure.
     * @param font - CSS font shorthand.
     * @returns Width-only text metrics.
     */
    measureText(text, font) {
      return measureShapedText(text, font, options);
    },
    /**
     * Shapes text through the loaded font.
     *
     * @param text - Text content to shape.
     * @param font - CSS font shorthand.
     * @param context - Per-run language and direction overrides.
     * @returns Cluster-based shape result.
     */
    shapeRun(text, font, context) {
      return shapeTextWithOptionalFallback(text, font, options, context);
    }
  };
}

/**
 * Measures text by shaping it first.
 *
 * @param text - Text content to measure.
 * @param font - CSS font shorthand.
 * @param options - Shaper measurer options.
 * @returns Width-only text metrics.
 */
function measureShapedText(
  text: string,
  font: string,
  options: QuireShaperTextMeasurerOptions
): QuireTextMetrics {
  return {
    width: shapeTextWithOptionalFallback(text, font, options).width
  };
}

/**
 * Shapes text through the loaded font and falls back to baseline measurement
 * when configured.
 *
 * @param text - Text content to shape.
 * @param font - CSS font shorthand.
 * @param options - Shaper measurer options.
 * @param context - Per-run language and direction overrides.
 * @returns Cluster-based shape result.
 */
function shapeTextWithOptionalFallback(
  text: string,
  font: string,
  options: QuireShaperTextMeasurerOptions,
  context?: QuireTextShapeContext
): QuireShapedTextRun {
  try {
    return options.font.shapeRun(resolveShapeRunOptions(text, font, options, context));
  } catch (error) {
    if (!options.fallbackMeasurer) {
      throw error;
    }

    const fallbackMeasurer = options.fallbackMeasurer;

    return shapeQuireTextRun(text, font, {
      measureText(value, fontToken) {
        return fallbackMeasurer.measureText(value, fontToken);
      }
    });
  }
}

/**
 * Resolves complete shape options for one run.
 *
 * @param text - Text content to shape.
 * @param font - CSS font shorthand.
 * @param options - Shaper measurer options.
 * @param context - Per-run language and direction overrides.
 * @returns Complete options passed to the loaded shaper font.
 */
function resolveShapeRunOptions(
  text: string,
  font: string,
  options: QuireShaperTextMeasurerOptions,
  context?: QuireTextShapeContext
): QuireShapeRunOptions {
  const resolved = options.resolveRunOptions?.(text, font);
  const shapeOptions: QuireShapeRunOptions = {
    text,
    font,
    size: resolved?.size ?? resolveQuireFontPixelSize(font)
  };
  const direction = context?.direction ?? resolved?.direction;
  const language = context?.language ?? resolved?.language;
  const features = resolveQuireShapeFeatures(
    resolved?.features,
    context?.disableOptionalLigatures === true
  );

  return {
    ...shapeOptions,
    ...(direction === undefined ? {} : { direction }),
    ...(resolved?.script ? { script: resolved.script } : {}),
    ...(language === undefined ? {} : { language }),
    ...(features === undefined ? {} : { features })
  };
}

/**
 * Resolves OpenType features for one semantic shaping invocation.
 *
 * Character tracking keeps required script shaping but suppresses optional
 * ligatures whose multi-grapheme clusters cannot carry independent advances.
 *
 * @param configured - Features configured by the font or caller.
 * @param disableOptionalLigatures - Whether tracking requires optional ligatures off.
 * @returns Configured features with deterministic optional-ligature overrides.
 */
export function resolveQuireShapeFeatures(
  configured: readonly QuireOpenTypeFeature[] | undefined,
  disableOptionalLigatures: boolean
): readonly QuireOpenTypeFeature[] | undefined {
  if (!disableOptionalLigatures) return configured;
  const retained = (configured ?? []).filter(
    (feature) => !optionalLigatureTags.includes(
      feature.tag as typeof optionalLigatureTags[number]
    )
  );
  return [
    ...retained,
    ...optionalLigatureTags.map((tag) => ({ tag, value: false }))
  ];
}
