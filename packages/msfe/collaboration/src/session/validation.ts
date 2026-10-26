import { Text, type Doc } from "yjs";
import type { CollaborationManifest } from "./types";

/** @param manifest - Untrusted provider admission. @param documentId - Requested identity. */
export function validateManifest(manifest: CollaborationManifest, documentId: string): void {
  if (!manifest || typeof documentId !== "string" || !documentId || manifest.documentId !== documentId || !manifest.epoch
    || typeof manifest.epoch !== "string") throw new Error("collaboration-document-identity");
  if (!["read", "write"].includes(manifest.permission) || typeof manifest.sourceFormat?.bom !== "boolean"
    || !["\n", "\r\n"].includes(manifest.sourceFormat.lineEnding)) throw new Error("collaboration-document-format");
}

/** @param document - Prepared CRDT state. @returns The single plain-text source, rejecting other persistent models. */
export function validateDocument(document: Doc): Text {
  const text = document.getText("source");
  if (document.share.size !== 1 || !(text instanceof Text)) throw new Error("collaboration-source-type");
  if (Object.keys(text.getAttributes()).length) throw new Error("collaboration-source-format");
  for (const part of text.toDelta()) if (typeof part.insert !== "string" || part.insert.includes("\r") || part.attributes) {
    throw new Error("collaboration-source-format");
  }
  return text;
}
