import { defaultQuireTextMeasurer, type QuireTextMeasurer } from "@quirekit/layout/text";
import { parseQuireFontPixelSize, tryCreateQuireBrowserTextMeasurer } from "@quirekit/renderer";
import {
  createBrowserFontMeasurementRevision
} from "../shared/text-measurement";

const SVG_NAMESPACE = "http://www.w3.org/2000/svg";

/** Default number of browser text width reads retained by the SVG measurer. */
const DEFAULT_SVG_BROWSER_TEXT_WIDTH_CACHE_SIZE = 2_048;

/** Browser-backed text measurer owned by an SVG mounted view. */
export interface SvgBrowserTextMeasurer extends QuireTextMeasurer {
  /** Explicitly clears measurements after already-loaded faces are registered. */
  invalidate(): void;
  /** Clears measurements only when the loaded font faces changed since the last clear. */
  invalidateIfFontSetChanged(): void;
  /** Removes the hidden SVG probe surface from the document. */
  destroy(): void;
}

/** Options used to create an SVG browser text measurer. */
export interface CreateSvgBrowserTextMeasurerOptions {
  /** Document that owns the hidden SVG probe surface. */
  readonly ownerDocument: Document;
  /** Fallback measurer used only when browser metrics are unavailable. */
  readonly fallbackMeasurer?: QuireTextMeasurer | undefined;
  /** Maximum browser width reads to cache; pass 0 to disable caching. */
  readonly widthCacheSize?: number | undefined;
  /** Requests fresh mounted layout after browser font metrics change. */
  readonly onFontSetChange?: (() => void) | undefined;
}

/**
 * Creates a browser-backed text measurer from a hidden SVG text probe.
 *
 * The returned measurer is intentionally narrow: browser reads replace the
 * inline width used by wrapping, while the shared browser reader supplies font
 * boxes and normal line height. The fallback `shapeRun()` is not exposed because shaped
 * advances would otherwise take precedence over browser widths during wrapping.
 *
 * @param options - Owner document and optional fallback measurer.
 * @returns Browser-backed SVG text measurer.
 */
export function createSvgBrowserTextMeasurer(
  options: CreateSvgBrowserTextMeasurerOptions
): SvgBrowserTextMeasurer {
  const fallbackMeasurer = options.fallbackMeasurer ?? defaultQuireTextMeasurer;
  const verticalMetricsReader = tryCreateQuireBrowserTextMeasurer({
    ownerDocument: options.ownerDocument
  });
  const probe = createSvgBrowserTextProbe(options.ownerDocument);
  const widthCache = new Map<string, number>();
  const widthCacheSize = options.widthCacheSize
    ?? DEFAULT_SVG_BROWSER_TEXT_WIDTH_CACHE_SIZE;
  const fontRevision = createBrowserFontMeasurementRevision(
    options.ownerDocument,
    () => {
      widthCache.clear();
      verticalMetricsReader?.clear();
      options.onFontSetChange?.();
    }
  );

  const measurer: SvgBrowserTextMeasurer = {
    get version(): number {
      return (fallbackMeasurer.version ?? 0) + fontRevision.version;
    },
    measureText(text, font) {
      const fallbackMetrics = verticalMetricsReader?.measureText(text, font)
        ?? fallbackMeasurer.measureText(text, font);
      const cacheKey = createSvgBrowserTextWidthCacheKey(text, font);
      const cachedWidth = readSvgBrowserTextWidthCache(widthCache, cacheKey);
      const measuredWidth = cachedWidth
        ?? measureSvgBrowserTextWidth(probe.text, text, font);

      if (measuredWidth !== null && cachedWidth === undefined) {
        writeSvgBrowserTextWidthCache(
          widthCache,
          cacheKey,
          measuredWidth,
          widthCacheSize
        );
      }

      return {
        ...fallbackMetrics,
        width: measuredWidth ?? fallbackMetrics.width
      };
    },
    invalidate() {
      fontRevision.invalidate();
    },
    invalidateIfFontSetChanged() {
      fontRevision.invalidateIfChanged();
    },
    destroy() {
      fontRevision.destroy();
      widthCache.clear();
      verticalMetricsReader?.clear();
      probe.svg.remove();
    }
  };

  return measurer;
}

/**
 * Creates the cache key for one SVG browser text width read.
 *
 * @param text - Text content being measured.
 * @param font - CSS font shorthand used for measurement.
 * @returns Stable text/font cache key.
 */
function createSvgBrowserTextWidthCacheKey(text: string, font: string): string {
  return `${font}\u0000${text}`;
}

/**
 * Reads a cached SVG browser text width and promotes it to most-recently used.
 *
 * @param cache - Width cache keyed by text and font.
 * @param key - Cache key to read.
 * @returns Cached width, or undefined on a miss.
 */
function readSvgBrowserTextWidthCache(
  cache: Map<string, number>,
  key: string
): number | undefined {
  const width = cache.get(key);

  if (width === undefined) {
    return undefined;
  }

  cache.delete(key);
  cache.set(key, width);

  return width;
}

/**
 * Stores an SVG browser text width and evicts oldest entries beyond the limit.
 *
 * @param cache - Width cache keyed by text and font.
 * @param key - Cache key to write.
 * @param width - Browser-measured text width.
 * @param maxEntries - Maximum entries to retain.
 */
function writeSvgBrowserTextWidthCache(
  cache: Map<string, number>,
  key: string,
  width: number,
  maxEntries: number
): void {
  if (maxEntries <= 0) {
    return;
  }

  if (cache.has(key)) {
    cache.delete(key);
  }

  cache.set(key, width);

  while (cache.size > maxEntries) {
    const oldest = cache.keys().next().value;

    if (oldest === undefined) {
      break;
    }

    cache.delete(oldest);
  }
}

/** Hidden SVG probe surface used for text measurement. */
interface SvgBrowserTextProbe {
  /** Hidden SVG root appended to the owner document. */
  readonly svg: SVGSVGElement;
  /** Text node measured by browser-native SVG text APIs. */
  readonly text: SVGTextContentElement;
}

/**
 * Creates and attaches the hidden SVG text measurement probe.
 *
 * @param ownerDocument - Document that should own the hidden probe.
 * @returns Hidden SVG probe elements.
 */
function createSvgBrowserTextProbe(ownerDocument: Document): SvgBrowserTextProbe {
  const svg = ownerDocument.createElementNS(SVG_NAMESPACE, "svg");
  const text = ownerDocument.createElementNS(
    SVG_NAMESPACE,
    "text"
  ) as SVGTextContentElement;

  svg.setAttribute("aria-hidden", "true");
  svg.setAttribute("focusable", "false");
  svg.style.position = "absolute";
  svg.style.left = "-10000px";
  svg.style.top = "-10000px";
  svg.style.width = "1px";
  svg.style.height = "1px";
  svg.style.overflow = "hidden";
  svg.style.visibility = "hidden";
  svg.style.pointerEvents = "none";
  text.style.whiteSpace = "pre";
  svg.appendChild(text);
  (ownerDocument.body ?? ownerDocument.documentElement).appendChild(svg);

  return { svg, text };
}

/**
 * Reads browser-native width for one text/font pair.
 *
 * @param textElement - Hidden SVG text element used for measurement.
 * @param text - Text content to measure.
 * @param font - CSS font shorthand used for measurement.
 * @returns Browser-measured text width, or null when the read fails.
 */
function measureSvgBrowserTextWidth(
  textElement: SVGTextContentElement,
  text: string,
  font: string
): number | null {
  try {
    textElement.textContent = text;
    textElement.style.font = font;
    // A larger probe transform reduces device-space rounding while preserving
    // the source font and its optical sizing. SVG returns local coordinates,
    // so the measured width already excludes this scale. Bound the effective
    // font size to avoid browser limits for unusually large document fonts.
    const fontSize = parseQuireFontPixelSize(font);
    const scale = fontSize !== null && fontSize > 0
      ? Math.max(1, Math.min(128, 4_096 / fontSize))
      : 1;
    textElement.setAttribute("transform", `scale(${scale})`);

    const width = textElement.getComputedTextLength();

    return Number.isFinite(width) ? width : null;
  } catch {
    return null;
  }
}
