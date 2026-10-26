import type { WhiteboardEditRequest } from "@quirekit/whiteboard";
import type { WhiteboardDraftBinding, WhiteboardDraftOptions } from "./types";

const bindings = new WeakMap<object, WhiteboardDraftBinding>();

/** @param owner - Actual host editor instance. @param binding - Host-owned persistent document identity. @returns Exact registration cleanup. */
export function bindWhiteboardDrafts(owner: object, binding: WhiteboardDraftBinding): () => void {
  bindings.set(owner, binding);
  return () => { if (bindings.get(owner) === binding) bindings.delete(owner); };
}

/** @param owner - Editor opening a task. @param request - Captured insertion/edit intent. @returns Static identity for this task, or no recovery when the host has not opted in. */
export function whiteboardDraftsFor(owner: object, request: WhiteboardEditRequest): WhiteboardDraftOptions | undefined {
  const binding = bindings.get(owner), documentId = binding?.documentId();
  if (!binding || !documentId) return undefined;
  return { namespace: binding.namespace, documentId, insertion: request.intent === "insert", ...(binding.store ? { store: binding.store } : {}) };
}
