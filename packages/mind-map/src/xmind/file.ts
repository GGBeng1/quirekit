import { parseXmindContent } from "./content";
import type { XmindImportResult } from "./types";
import { xmindResourcePath } from "./import/details";

/**
 * Converts a modern or XMind 8 file without opening a UI or writing to a host document.
 * @param bytes - File bytes, e.g. new Uint8Array(await file.arrayBuffer()) or a Node Buffer.
 * @returns All editable sheets with explicit unsupported-content diagnostics.
 */
export async function importXmindFile(bytes: Uint8Array): Promise<XmindImportResult> {
  if (!(bytes instanceof Uint8Array) || bytes.length > 32000000) throw new RangeError("XMind: file budget exceeded or invalid bytes");
  const detached = new Uint8Array(bytes);
  const { readXmindArchive } = await import("./archive");
  const archive = readXmindArchive(detached);
  const input = archive.xml ? (await import("./xml")).parseXmindXml(archive.source, archive.styles) : JSON.parse(archive.source);
  const paths = new Set<string>(), pending: unknown[] = [input]; let count = 0;
  while (pending.length) {
    const value = pending.pop(); if (!value || typeof value !== "object") continue;
    if (++count > 100000) throw new RangeError("XMind: content object budget exceeded");
    const path = xmindResourcePath((value as Record<string, unknown>).src);
    if (path?.toLowerCase().endsWith(".png")) paths.add(path);
    for (const child of Object.values(value)) pending.push(child);
  }
  const images = archive.readResources([...paths]);
  return parseXmindContent(input, { readResource: path => images.get(path) });
}
