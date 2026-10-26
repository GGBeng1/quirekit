import { readMindMapDocument, type MindMapDocument, type MindMapNode } from "@quirekit/mind-map";
import { MindMapRecoveryError } from "./errors";
import { readRecoveryContent, recoveryObject } from "./validation";
import type { MindEditorRecoveryOptions, MindMapRecoveryIdentity, MindMapRecoveryRecord } from "./types";

/** @param source - Initial authoritative model. @param title - Initial host title. @param options - Explicit host scope.
 * @returns Stable local slot and semantic fingerprint, excluding only generated insertion identities. */
export async function mindMapRecoveryIdentity(source: MindMapDocument, title: string, options: MindEditorRecoveryOptions): Promise<MindMapRecoveryIdentity> {
  if (![options.namespace, options.documentId, options.targetId].every(value => typeof value === "string" && value.trim() && value.length <= 1024)) throw new MindMapRecoveryError("draftIdentity");
  const key = JSON.stringify([options.namespace, options.documentId, options.insertion ? ["insert"] : ["map", options.targetId]]);
  const document = readMindMapDocument(source);
  /** @param node - Initial insertion topic. @returns Source fields without the fresh generated identity. */
  function withoutIdentity(node: MindMapNode): unknown { const { id: _id, children, ...rest } = node; return { ...rest, children: children.map(withoutIdentity) }; }
  const baseline = options.insertion ? { ...document, root: withoutIdentity(document.root) } : { id: options.targetId, ...document };
  const bytes = new TextEncoder().encode(JSON.stringify({ title, document: baseline }));
  const hash = await globalThis.crypto.subtle.digest("SHA-256", bytes);
  return { key, base: Array.from(new Uint8Array(hash), byte => byte.toString(16).padStart(2, "0")).join("") };
}
/** @param value - Untrusted host/browser checkpoint. @returns Detached, bounded admitted record; never removes failed records. */
export function readMindMapRecoveryRecord(value: unknown): MindMapRecoveryRecord {
  const data = recoveryObject(value, ["version", "token", "updatedAt", "base", "checkpoint"]);
  if (data.version !== 1 || typeof data.token !== "string" || !data.token || data.token.length > 200
    || typeof data.updatedAt !== "number" || !Number.isSafeInteger(data.updatedAt) || data.updatedAt < 0 || data.updatedAt > 8_640_000_000_000_000
    || typeof data.base !== "string" || !/^[a-f0-9]{64}$/u.test(data.base)) throw new MindMapRecoveryError("draftFormat");
  const checkpoint = recoveryObject(data.checkpoint, ["document", "pending", "selectedId"]), document = readMindMapDocument(checkpoint.document);
  const pending = readRecoveryContent(document, checkpoint.pending);
  if (checkpoint.selectedId !== null && (typeof checkpoint.selectedId !== "string" || checkpoint.selectedId.length > 128)) throw new MindMapRecoveryError("draftFormat");
  const source = JSON.stringify({ ...data, checkpoint: { document, pending, selectedId: checkpoint.selectedId } });
  if (source.length > 16 * 1024 * 1024 || new TextEncoder().encode(source).byteLength > 16 * 1024 * 1024) throw new MindMapRecoveryError("draftLimit");
  return JSON.parse(source) as MindMapRecoveryRecord;
}
