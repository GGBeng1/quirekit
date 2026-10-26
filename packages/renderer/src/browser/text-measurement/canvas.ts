import type {
  QuireBrowserTextMetrics,
  QuireBrowserTextMeasurer,
  QuireBrowserTextMeasurerOptions
} from "./types";
import { createBrowserNormalLineHeightReader } from "./normal-line-height";
import { BrowserTextMetricsCache } from "./metrics-cache";

/**
 * Default number of browser text metrics retained by one reader.
 *
 * Body layout measures cumulative grapheme prefixes, so a long document needs
 * tens of thousands of distinct entries. Each generation holds half, and a
 * full-document pass must fit in one generation to stop re-measuring.
 */
const DEFAULT_BROWSER_CANVAS_TEXT_METRICS_CACHE_SIZE = 32_768;

/**
 * Creates the exact browser font-metric capability shared by views and exports.
 *
 * @param options - Explicit owner document and bounded cache limit.
 * @returns Clearable reader, or undefined when Canvas measurement is unavailable.
 */
export function tryCreateQuireBrowserTextMeasurer(
  options: QuireBrowserTextMeasurerOptions
): QuireBrowserTextMeasurer | undefined {
  const context = resolveBrowserCanvasMeasurementContext(options.ownerDocument);
  if (context === null) return undefined;
  const cacheSize = options.cacheSize
    ?? DEFAULT_BROWSER_CANVAS_TEXT_METRICS_CACHE_SIZE;
  const metricsCache = new BrowserTextMetricsCache<QuireBrowserTextMetrics>(cacheSize);
  const lineHeightReader = createBrowserNormalLineHeightReader(
    options.ownerDocument,
    cacheSize
  );

  return {
    measureText(text, font) {
      const cached = metricsCache.get(font, text);
      if (cached !== undefined) {
        return cached;
      }

      context.font = font;
      const browserMetrics = context.measureText(text);
      const lineHeight = lineHeightReader.measure(font, text);
      const metrics: QuireBrowserTextMetrics = {
        width: browserMetrics.width,
        ...(typeof browserMetrics.fontBoundingBoxAscent === "number"
          ? { ascent: browserMetrics.fontBoundingBoxAscent }
          : {}),
        ...(typeof browserMetrics.fontBoundingBoxDescent === "number"
          ? { descent: browserMetrics.fontBoundingBoxDescent }
          : {}),
        ...(lineHeight === undefined ? {} : { lineHeight })
      };

      metricsCache.set(font, text, metrics);
      return metrics;
    },
    clear() {
      metricsCache.clear();
      lineHeightReader.clear();
    }
  };
}

/**
 * Resolves an exact Canvas context while tolerating non-browser documents.
 *
 * @param ownerDocument - Document used to create the detached Canvas.
 * @returns Canvas context with `measureText`, or null when unavailable.
 */
function resolveBrowserCanvasMeasurementContext(
  ownerDocument: Document
): CanvasRenderingContext2D | null {
  try {
    const context = ownerDocument.createElement("canvas").getContext("2d");

    return context !== null && typeof context.measureText === "function"
      ? context
      : null;
  } catch {
    return null;
  }
}
