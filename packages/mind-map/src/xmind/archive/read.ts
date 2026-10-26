import { strFromU8, Unzip, UnzipInflate, unzipSync } from "fflate";
import type { XmindArchive } from "./types";

/** @param bytes - Detached bounded ZIP. @returns Selected content and batched resource reader. */
export function readXmindArchive(bytes: Uint8Array): XmindArchive {
  const entries = new Map<string, { name: string; size: number }>();
  // Central directory inspection never inflates images; normalized names must be
  // unique so a local-header duplicate cannot change the selected content.
  unzipSync(bytes, { filter(file) {
    if (entries.size >= 10000) throw new RangeError("XMind: ZIP entry budget exceeded");
    const name = file.name === "/content.xml" ? "content.xml" : file.name;
    if (entries.has(name)) throw new TypeError(`XMind: duplicate ${name}`);
    if (/[\\\u0000-\u001f\u007f]/u.test(name) || name.startsWith("/") || name.split("/").some(part => part === "." || part === "..")) throw new TypeError("XMind: invalid ZIP path");
    entries.set(name, { name: file.name, size: file.originalSize });
    return false;
  } });

  /** @param names - Requested entries. @param perEntry - Single inflation bound. @param aggregate - Combined inflation bound. @returns Exact bytes of existing entries. */
  function read(names: readonly string[], perEntry: number, aggregate: number): Map<string, Uint8Array> {
    const selected = new Map<string, { key: string; size: number }>();
    for (const name of new Set(names)) {
      const entry = entries.get(name); if (!entry) continue;
      if (entry.size > perEntry) throw new RangeError("XMind: entry budget exceeded");
      selected.set(entry.name, { key: name, size: entry.size });
    }
    const result = new Map<string, Uint8Array>(); const started = new Set<string>(); let total = 0;
    const unzip = new Unzip(file => {
      const target = selected.get(file.name); if (!target) return;
      if (started.has(file.name)) throw new TypeError("XMind: duplicate local ZIP entry");
      started.add(file.name); const chunks: Uint8Array[] = []; let length = 0;
      file.ondata = (error, chunk, final) => {
        if (error) throw error;
        length += chunk.length; total += chunk.length;
        if (length > perEntry || total > aggregate) throw new RangeError("XMind: inflated content or resource budget exceeded");
        chunks.push(chunk);
        if (final) {
          if (length !== target.size) throw new TypeError("XMind: incomplete content entry");
          const value = new Uint8Array(length); let offset = 0;
          for (const part of chunks) { value.set(part, offset); offset += part.length; }
          result.set(target.key, value);
        }
      };
      file.start();
    });
    unzip.register(UnzipInflate);
    // Bound temporary inflation even when declared lengths are false. Resources
    // are inflated in one pass after references have been resolved from content.
    for (let offset = 0; offset < bytes.length; offset += 1024) unzip.push(bytes.subarray(offset, offset + 1024), offset + 1024 >= bytes.length);
    if (result.size !== selected.size) throw new TypeError("XMind: incomplete ZIP entries");
    return result;
  }
  const key = entries.has("content.json") ? "content.json" : "content.xml";
  if (!entries.has(key)) throw new TypeError("XMind: missing content.json or content.xml");
  const xml = key === "content.xml", content = read([key, ...(xml && entries.has("styles.xml") ? ["styles.xml"] : [])], 4000000, 8000000);
  return { source: strFromU8(content.get(key)!), xml,
    ...(content.has("styles.xml") ? { styles: strFromU8(content.get("styles.xml")!) } : {}),
    readResources: names => read(names, 750000, 3000000) };
}
