/**
 * Bounded text-metrics cache keyed by font, then text, with generational eviction.
 *
 * Long font shorthands are never concatenated into per-call keys. When the
 * young generation fills, it replaces the old one wholesale; an old-generation
 * hit is copied back into the young one, so recently read entries survive while
 * at most `maxEntries` are retained.
 */
export class BrowserTextMetricsCache<Value> {
  /** Entries written or promoted since the last rotation. */
  private young = new Map<string, Map<string, Value>>();
  /** Entries of the previous generation, dropped at the next rotation. */
  private old = new Map<string, Map<string, Value>>();
  /** Entries held by the young generation. */
  private youngSize = 0;
  /** Entries one generation holds before it rotates; zero disables caching. */
  private readonly generationSize: number;

  /** @param maxEntries - Upper bound of retained entries across both generations. */
  constructor(maxEntries: number) {
    this.generationSize = maxEntries <= 0 ? 0 : Math.max(1, Math.floor(maxEntries / 2));
  }

  /**
   * @param font - CSS font shorthand.
   * @param text - Measured text.
   * @returns Cached value, or undefined on a miss.
   */
  get(font: string, text: string): Value | undefined {
    const young = this.young.get(font)?.get(text);
    if (young !== undefined) return young;
    const old = this.old.get(font)?.get(text);
    if (old !== undefined) this.set(font, text, old);
    return old;
  }

  /**
   * @param font - CSS font shorthand.
   * @param text - Measured text.
   * @param value - Value to retain.
   */
  set(font: string, text: string, value: Value): void {
    if (this.generationSize === 0) return;
    if (this.youngSize >= this.generationSize) {
      this.old = this.young;
      this.young = new Map();
      this.youngSize = 0;
    }
    let texts = this.young.get(font);
    if (texts === undefined) {
      texts = new Map();
      this.young.set(font, texts);
    }
    texts.set(text, value);
    this.youngSize += 1;
  }

  /** Drops every retained entry. */
  clear(): void {
    this.young = new Map();
    this.old = new Map();
    this.youngSize = 0;
  }
}
