import { contentHash } from "../protocol/hash";
import type { ActivityPage, CompactionReport, PendingVersion, RetentionPolicy, VersionContent, VersionRecord, VersionStore } from "../protocol/types";
import type { MemoryStoreOptions } from "./types";

const hour = 3_600_000, day = 24 * hour;

/**
 * In-memory reference version store. Content is kept once per hash; nothing survives a reload.
 * @param options - Clock and identity.
 * @returns A version store.
 */
export function createMemoryVersionStore(options: Omit<MemoryStoreOptions, "canView" | "retention"> = {}): VersionStore {
  const now = options.now ?? (() => new Date());
  const records: VersionRecord[] = [], contents = new Map<string, VersionContent>();
  let counter = 0;
  return {
    async create(version: PendingVersion, content: VersionContent): Promise<VersionRecord> {
      const hash = contentHash(content.value);
      const latest = [...records].reverse().find(record => record.documentId === version.documentId);
      // Repeated automatic checkpoints of unchanged content reuse the latest version.
      if (!version.name && version.trigger === "auto" && latest?.content.hash === hash && latest.content.format === content.format) return latest;
      const ref = `memory:${hash}`;
      if (!contents.has(ref)) contents.set(ref, { ...content });
      const record: VersionRecord = Object.freeze({ ...structuredClone(version), formatVersion: 1 as const, id: options.createId?.() ?? `version-${++counter}`,
        createdAt: now().toISOString(), content: { ref, format: content.format, bytes: new TextEncoder().encode(content.value).length, hash } });
      records.push(record);
      return record;
    },
    async list(query): Promise<ActivityPage<VersionRecord>> {
      if (!Number.isInteger(query.limit) || query.limit < 1) throw new RangeError("version list limit must be a positive integer");
      const own = records.filter(record => record.documentId === query.documentId).reverse();
      const start = query.cursor ? own.findIndex(record => record.id === query.cursor) + 1 : 0;
      if (query.cursor && start === 0) throw new TypeError("version cursor does not match this query");
      const items = own.slice(start, start + query.limit);
      return { items, ...(start + query.limit < own.length ? { cursor: items.at(-1)!.id } : {}) };
    },
    async read(id: string) {
      const record = records.find(item => item.id === id);
      const content = record && contents.get(record.content.ref);
      return record && content ? { record, content: { ...content } } : null;
    },
    async compact(policy: RetentionPolicy, at = now()): Promise<CompactionReport> {
      let versionsRemoved = 0;
      // Apply the strictest rule that covers each version: older versions use the widest bucket.
      const rules = [...policy.versionThinning ?? []].sort((a, b) => b.olderThanDays - a.olderThanDays);
      const kept = new Set<string>();
      for (const record of [...records].reverse()) {
        const age = at.getTime() - Date.parse(record.createdAt);
        const rule = rules.find(item => age > item.olderThanDays * day);
        if (record.trigger !== "auto" || !rule) continue;
        const bucket = `${record.documentId}:${rule.keepEveryHours}:${Math.floor(Date.parse(record.createdAt) / (rule.keepEveryHours * hour))}`;
        if (kept.has(bucket)) { records.splice(records.indexOf(record), 1); versionsRemoved++; } else kept.add(bucket);
      }
      const referenced = new Set(records.map(record => record.content.ref));
      for (const ref of contents.keys()) if (!referenced.has(ref)) contents.delete(ref);
      return { summarized: 0, removed: 0, versionsRemoved };
    },
  };
}
