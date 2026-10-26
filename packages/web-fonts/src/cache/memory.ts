import type { QuireWebFontCache, QuireWebFontCacheRecord } from "../types";

/**
 * Creates a deterministic session-only font cache.
 *
 * @returns In-memory cache implementing the persistent-cache contract.
 */
export function createQuireMemoryFontCache(): QuireWebFontCache {
  const records = new Map<string, QuireWebFontCacheRecord>();
  return {
    persistent: false,
    /** @inheritdoc */
    async get(key: string): Promise<QuireWebFontCacheRecord | undefined> {
      return records.get(key);
    },
    /** @inheritdoc */
    async put(record: QuireWebFontCacheRecord): Promise<void> {
      records.set(record.key, record);
    },
    /** @inheritdoc */
    async delete(key: string): Promise<void> {
      records.delete(key);
    },
    /** @inheritdoc */
    async deleteFamily(normalizedFamily: string): Promise<void> {
      for (const [key, record] of records) {
        if (record.normalizedFamily === normalizedFamily) records.delete(key);
      }
    },
    /** @inheritdoc */
    destroy(): void {
      records.clear();
    }
  };
}
