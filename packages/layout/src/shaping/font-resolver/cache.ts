import type {
  QuireShapedTextRun,
  QuireTextShapeContext
} from "../../text/types";

/** Options used to create a shaped-run cache. */
export interface QuireShapedRunCacheOptions {
  /** Maximum number of shaped runs retained by the cache. */
  readonly maxEntries: number;
}

/** Small LRU cache for font-resolved shaped text runs. */
export interface QuireShapedRunCache {
  /**
   * Reads a cached shaped run.
   *
   * @param text - Text content used by the shape request.
   * @param font - CSS font shorthand used by the shape request.
   * @param context - Per-run language and direction cache identity.
   * @returns Cached shaped run, or undefined when absent.
   */
  get(
    text: string,
    font: string,
    context?: QuireTextShapeContext
  ): QuireShapedTextRun | undefined;
  /**
   * Stores a shaped run.
   *
   * @param text - Text content used by the shape request.
   * @param font - CSS font shorthand used by the shape request.
   * @param run - Shaped run to store.
   * @param context - Per-run language and direction cache identity.
   */
  set(
    text: string,
    font: string,
    run: QuireShapedTextRun,
    context?: QuireTextShapeContext
  ): void;
}

/**
 * Creates a bounded LRU cache for shaped text runs.
 *
 * @param options - Cache sizing options.
 * @returns Shaped-run cache.
 */
export function createQuireShapedRunCache(
  options: QuireShapedRunCacheOptions
): QuireShapedRunCache {
  const entries = new Map<string, QuireShapedTextRun>();

  return {
    get(text, font, context) {
      const key = createCacheKey(text, font, context);
      const value = entries.get(key);

      if (!value) {
        return undefined;
      }

      entries.delete(key);
      entries.set(key, value);

      return value;
    },
    set(text, font, run, context) {
      if (options.maxEntries <= 0) {
        return;
      }

      const key = createCacheKey(text, font, context);

      if (entries.has(key)) {
        entries.delete(key);
      }

      entries.set(key, run);

      while (entries.size > options.maxEntries) {
        const oldest = entries.keys().next().value;

        if (oldest === undefined) {
          break;
        }

        entries.delete(oldest);
      }
    }
  };
}

/**
 * Creates a cache key for one shape request.
 *
 * @param text - Text content used by the shape request.
 * @param font - CSS font shorthand used by the shape request.
 * @param context - Per-run language and direction cache identity.
 * @returns Stable cache key.
 */
function createCacheKey(
  text: string,
  font: string,
  context?: QuireTextShapeContext
): string {
  return `${font}\u0000${context?.language ?? ""}\u0000${context?.direction ?? ""}\u0000${context?.disableOptionalLigatures === true ? "no-optional-ligatures" : "default-ligatures"}\u0000${text}`;
}
