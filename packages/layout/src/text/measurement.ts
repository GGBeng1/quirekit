import type { QuireTextMeasurer, QuireTextMetrics } from "./types";

const fallbackGlyphWidth = 8;

/**
 * Deterministic environment-neutral fallback used when a host does not inject
 * an exact text measurement capability.
 *
 * Browser-mounted views should provide their own Canvas, SVG, or DOM-backed
 * measurer. Keeping this fallback approximate prevents consumer-neutral layout
 * from owning browser globals while preserving headless layout availability.
 */
export const defaultQuireTextMeasurer: QuireTextMeasurer = {
  measureText: measureQuireText
};

/**
 * Estimates text width without reading host-specific font metrics.
 *
 * @param text - Text content to measure.
 * @param _font - CSS font shorthand reserved for injected exact measurers.
 * @returns Deterministic fallback metrics for the supplied text.
 */
function measureQuireText(text: string, _font: string): QuireTextMetrics {
  return { width: Array.from(text).length * fallbackGlyphWidth };
}
