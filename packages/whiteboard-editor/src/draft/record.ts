import { WhiteboardError } from "@quirekit/whiteboard";
import { readWhiteboardScene, whiteboardMaximumBytes, whiteboardRecord, type WhiteboardDocument } from "@quirekit/whiteboard";
import type { DraftIdentity, WhiteboardDraftOptions, WhiteboardDraftRecord } from "./types";

/** @param document - Canonical source at opening. @param options - Explicit host identity. @returns Scoped slot and semantic baseline. */
export async function draftIdentity(document: WhiteboardDocument, options: WhiteboardDraftOptions): Promise<DraftIdentity> {
  if (!options.namespace.trim() || !options.documentId.trim()) throw new WhiteboardError("draftIdentity", "本机草稿需要稳定的文档标识");
  const key = JSON.stringify([options.namespace, options.documentId, options.insertion ? ["insert"] : ["board", document.id]]);
  // A pending insertion has a new random ID after reload. Its slot is explicit;
  // existing boards additionally guard identity, revision, title and native source.
  const source = JSON.stringify(options.insertion ? { title: document.title, scene: document.scene }
    : { id: document.id, revision: document.revision, title: document.title, scene: document.scene });
  const hash = await globalThis.crypto.subtle.digest("SHA-256", new TextEncoder().encode(source));
  return { key, base: Array.from(new Uint8Array(hash), byte => byte.toString(16).padStart(2, "0")).join("") };
}

/** @param value - Untrusted browser/host storage. @returns Detached bounded checkpoint, preserving unsupported data on failure. */
export function readDraftRecord(value: unknown): WhiteboardDraftRecord {
  if (!whiteboardRecord(value) || value.version !== 1 || typeof value.token !== "string" || !value.token || value.token.length > 200
    || typeof value.updatedAt !== "number" || !Number.isSafeInteger(value.updatedAt) || value.updatedAt < 0 || value.updatedAt > 8_640_000_000_000_000
    || typeof value.base !== "string" || !/^[a-f0-9]{64}$/u.test(value.base)) throw new WhiteboardError("draftFormat", "本机草稿格式不受支持，原数据已保留");
  readWhiteboardScene(value.scene);
  const source = JSON.stringify({ version: 1, token: value.token, updatedAt: value.updatedAt, base: value.base, scene: value.scene });
  if (source.length > whiteboardMaximumBytes || new TextEncoder().encode(source).byteLength > whiteboardMaximumBytes) throw new WhiteboardError("draftTooLarge", "本机草稿超过 16 MB，请导出文件保存");
  return JSON.parse(source) as WhiteboardDraftRecord;
}
