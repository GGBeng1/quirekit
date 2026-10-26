import { defaultQuireTextMeasurer, type QuireTextMeasurer } from "@quirekit/layout/text";
import { tryCreateQuireBrowserTextMeasurer } from "@quirekit/renderer";
import {
  createBrowserFontMeasurementRevision
} from "../shared/text-measurement";

/** Browser-backed text measurer owned by a mounted Canvas view. */
export interface CanvasBrowserTextMeasurer extends QuireTextMeasurer {
  /** Explicitly clears measurements after already-loaded faces are registered. */
  invalidate(): void;
  /** Clears measurements only when the loaded font faces changed since the last clear. */
  invalidateIfFontSetChanged(): void;
  /** Releases cached measurements retained by the mounted view. */
  destroy(): void;
}

/** Options used to create a mounted Canvas browser text measurer. */
export interface CreateCanvasBrowserTextMeasurerOptions {
  /** Document that owns the detached Canvas measurement surface. */
  readonly ownerDocument: Document;
  /** Fallback used when the browser Canvas context is unavailable. */
  readonly fallbackMeasurer?: QuireTextMeasurer | undefined;
  /** Maximum text/font measurements to cache, defaulting to the shared reader's; pass 0 to disable caching. */
  readonly cacheSize?: number | undefined;
  /** Requests fresh mounted layout after browser font metrics change. */
  readonly onFontSetChange?: (() => void) | undefined;
}

/**
 * Creates the exact browser measurement capability for one mounted Canvas view.
 *
 * The detached surface belongs to the mounted-view adapter rather than the
 * consumer-neutral layout package. This keeps browser capability ownership at
 * the host boundary and gives the view an explicit cache lifecycle.
 *
 * @param options - Owner document, fallback, and cache limit.
 * @returns Browser-backed Canvas text measurer.
 */
export function createCanvasBrowserTextMeasurer(
  options: CreateCanvasBrowserTextMeasurerOptions
): CanvasBrowserTextMeasurer {
  const fallback = options.fallbackMeasurer ?? defaultQuireTextMeasurer;
  const metricsReader = tryCreateQuireBrowserTextMeasurer({
    ownerDocument: options.ownerDocument,
    cacheSize: options.cacheSize
  });
  const fontRevision = createBrowserFontMeasurementRevision(
    options.ownerDocument,
    () => {
      metricsReader?.clear();
      options.onFontSetChange?.();
    }
  );

  const measurer: CanvasBrowserTextMeasurer = {
    get version(): number {
      return fontRevision.version;
    },
    measureText(text, font) {
      return metricsReader?.measureText(text, font) ?? fallback.measureText(text, font);
    },
    invalidate() {
      fontRevision.invalidate();
    },
    invalidateIfFontSetChanged() {
      fontRevision.invalidateIfChanged();
    },
    destroy() {
      fontRevision.destroy();
      metricsReader?.clear();
    }
  };

  return measurer;
}
