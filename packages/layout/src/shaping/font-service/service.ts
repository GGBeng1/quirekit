import {
  createQuireFontResolver,
  createQuireTextMeasurerFromFontResolver
} from "../font-resolver";
import type { QuireLoadedShaperFont } from "../types";
import type {
  QuireFontService,
  QuireFontServiceOptions
} from "./types";
import { createQuireFontServiceGlyphPathSource } from "./glyph-path-source";
import { resolveQuireFontServiceSource } from "./source";

/** Concrete canvas font service implementation. */
class DefaultCanvasFontService implements QuireFontService {
  /** Loaded shaper fonts managed by this service. */
  readonly fonts: readonly QuireLoadedShaperFont[];

  /** Resolver that maps CSS font requests to loaded font runs. */
  readonly resolver: QuireFontService["resolver"];

  /** Text measurer backed by the service resolver. */
  readonly textMeasurer: QuireFontService["textMeasurer"];

  /** Renderer-compatible glyph path source backed by loaded fonts. */
  readonly glyphPathSource: QuireFontService["glyphPathSource"];

  private readonly backend: QuireFontServiceOptions["backend"];
  private destroyed = false;

  /**
   * Creates a font service from loaded fonts.
   *
   * @param options - Service backend, loaded fonts, and fallback families.
   */
  constructor(options: {
    readonly backend: QuireFontServiceOptions["backend"];
    readonly fonts: readonly QuireLoadedShaperFont[];
    readonly fallbackMeasurer?: QuireFontServiceOptions["fallbackMeasurer"];
    readonly normalizeWidthToFallbackMeasurer?: QuireFontServiceOptions["normalizeWidthToFallbackMeasurer"];
    readonly fallbackFamilies?: QuireFontServiceOptions["fallbackFamilies"];
  }) {
    this.backend = options.backend;
    this.fonts = options.fonts;
    this.glyphPathSource = createQuireFontServiceGlyphPathSource(options.fonts);
    this.resolver = createQuireFontResolver({
      fonts: options.fonts,
      ...(options.fallbackFamilies === undefined
        ? {}
        : { fallbackFamilies: options.fallbackFamilies })
    });
    this.textMeasurer = createQuireTextMeasurerFromFontResolver({
      resolver: this.resolver,
      ...(options.fallbackMeasurer === undefined
        ? {}
        : { fallbackMeasurer: options.fallbackMeasurer }),
      ...(options.normalizeWidthToFallbackMeasurer === undefined
        ? {}
        : { normalizeWidthToFallbackMeasurer: options.normalizeWidthToFallbackMeasurer })
    });
  }

  /**
   * Releases loaded fonts followed by backend resources.
   *
   * @returns Optional promise when backend cleanup is asynchronous.
   */
  async destroy(): Promise<void> {
    if (this.destroyed) {
      return;
    }

    this.destroyed = true;
    await destroyLoadedQuireFonts(this.fonts, this.backend);
  }
}

/**
 * Creates a font service by loading all configured font sources.
 *
 * @param options - Shaper backend, raw font sources, and fallback families.
 * @returns Font service with resolver and text measurer.
 */
export async function createQuireFontService(
  options: QuireFontServiceOptions
): Promise<QuireFontService> {
  // Load all fonts in parallel (the fetches dominate); on any failure, destroy the
  // ones that did load before rethrowing.
  const results = await Promise.allSettled(
    options.sources.map(async (source) => options.backend.loadFont(
      await resolveQuireFontServiceSource(source, options.loadSourceData)
    ))
  );
  const fonts: QuireLoadedShaperFont[] = results
    .filter((result): result is PromiseFulfilledResult<QuireLoadedShaperFont> => result.status === "fulfilled")
    .map((result) => result.value);
  const failure = results.find((result) => result.status === "rejected");

  if (failure) {
    await destroyLoadedQuireFonts(fonts, options.backend);
    throw (failure as PromiseRejectedResult).reason;
  }

  return new DefaultCanvasFontService({
    backend: options.backend,
    fonts,
    ...(options.fallbackMeasurer === undefined
      ? {}
      : { fallbackMeasurer: options.fallbackMeasurer }),
    ...(options.normalizeWidthToFallbackMeasurer === undefined
      ? {}
      : { normalizeWidthToFallbackMeasurer: options.normalizeWidthToFallbackMeasurer }),
    ...(options.fallbackFamilies === undefined
      ? {}
      : { fallbackFamilies: options.fallbackFamilies })
  });
}

/**
 * Releases partially initialized font service resources.
 *
 * @param fonts - Fonts loaded before failure or teardown.
 * @param backend - Backend that may own shared resources.
 * @returns Promise that resolves after cleanup completes.
 */
async function destroyLoadedQuireFonts(
  fonts: readonly QuireLoadedShaperFont[],
  backend: QuireFontServiceOptions["backend"]
): Promise<void> {
  for (const font of fonts) {
    font.destroy?.();
  }

  await backend.destroy?.();
}
