import type { BrowserNormalLineHeightReader } from "./types";

const normalLineHeightSample = "Hg";
const hanLineHeightSample = "田";
const kanaLineHeightSample = "あ";
const hangulLineHeightSample = "한";

/**
 * Creates a bounded browser-normal line-height reader.
 *
 * @param ownerDocument - Document that owns temporary probes.
 * @param maxEntries - Maximum font entries retained by the cache.
 * @returns Cached reader with an explicit invalidation lifecycle.
 */
export function createBrowserNormalLineHeightReader(
  ownerDocument: Document,
  maxEntries: number
): BrowserNormalLineHeightReader {
  const cache = new Map<string, number | undefined>();

  return {
    measure(font, text) {
      const sample = resolveBrowserNormalLineHeightSample(text);
      const key = `${font}\u0000${sample}`;
      if (cache.has(key)) {
        const cached = cache.get(key);
        cache.delete(key);
        cache.set(key, cached);
        return cached;
      }

      const lineHeight = measureBrowserNormalLineHeight(
        ownerDocument,
        font,
        sample
      );
      writeCachedLineHeight(cache, key, lineHeight, maxEntries);
      return lineHeight;
    },
    clear() {
      cache.clear();
    }
  };
}

/**
 * Measures the browser-used `line-height: normal` for one CSS font token.
 *
 * Canvas text metrics expose glyph boxes but not the font line gap. A detached
 * DOM probe supplies that missing host capability without leaking browser
 * globals into consumer-neutral layout packages.
 *
 * @param ownerDocument - Document that owns the temporary probe.
 * @param font - CSS font shorthand used by layout and paint.
 * @param sample - Script-specific glyph sample selecting the painted fallback face.
 * @returns Positive browser line height, or undefined when unavailable.
 */
export function measureBrowserNormalLineHeight(
  ownerDocument: Document,
  font: string,
  sample = normalLineHeightSample
): number | undefined {
  let probe: HTMLElement | undefined;

  try {
    const host = ownerDocument.body ?? ownerDocument.documentElement;
    if (host === null) {
      return undefined;
    }

    probe = ownerDocument.createElement("span");
    probe.textContent = sample;
    probe.style.position = "absolute";
    probe.style.left = "-10000px";
    probe.style.top = "-10000px";
    probe.style.visibility = "hidden";
    probe.style.pointerEvents = "none";
    probe.style.whiteSpace = "nowrap";
    probe.style.font = font;
    probe.style.lineHeight = "normal";
    host.appendChild(probe);

    const lineHeight = probe.getBoundingClientRect().height;
    return Number.isFinite(lineHeight) && lineHeight > 0
      ? lineHeight
      : undefined;
  } catch {
    return undefined;
  } finally {
    if (typeof probe?.remove === "function") {
      probe.remove();
    }
  }
}

/**
 * Selects one bounded script sample for the browser-normal line-height cache.
 *
 * The same CSS stack can resolve Latin and East Asian glyphs to different
 * faces. Cache identity therefore includes the script sample while equivalent
 * characters in one script share a stable representative.
 *
 * @param text - Text whose painted fallback face must supply the line strut.
 * @returns Stable representative for the first vertical-metric script in text.
 */
function resolveBrowserNormalLineHeightSample(text: string): string {
  if (/\p{Script=Han}/u.test(text)) return hanLineHeightSample;
  if (/[\p{Script=Hiragana}\p{Script=Katakana}]/u.test(text)) {
    return kanaLineHeightSample;
  }
  if (/\p{Script=Hangul}/u.test(text)) return hangulLineHeightSample;
  return normalLineHeightSample;
}

/**
 * Stores one font line height and evicts oldest entries beyond the limit.
 *
 * @param cache - Line-height cache keyed by CSS font.
 * @param font - CSS font key to write.
 * @param lineHeight - Measured line height, including unsupported results.
 * @param maxEntries - Maximum entries retained by the cache.
 */
function writeCachedLineHeight(
  cache: Map<string, number | undefined>,
  font: string,
  lineHeight: number | undefined,
  maxEntries: number
): void {
  if (maxEntries <= 0) {
    return;
  }

  cache.set(font, lineHeight);
  while (cache.size > maxEntries) {
    const oldest = cache.keys().next().value;
    if (oldest === undefined) {
      break;
    }
    cache.delete(oldest);
  }
}
