import type { MindMapEditRequest } from "@quirekit/mind-map";
import type { MindMapRecoveryBinding, MindEditorRecoveryOptions } from "./types";

const bindings = new WeakMap<object, MindMapRecoveryBinding>();
/** @param owner - Real mounted editor. @param binding - Host identity and optional store. @returns Exact registration cleanup. */
export function bindMindMapRecovery(owner: object, binding: MindMapRecoveryBinding): () => void {
  bindings.set(owner, binding);
  return () => { if (bindings.get(owner) === binding) bindings.delete(owner); };
}
/** @param owner - Editor opening a task. @param request - Captured edit/insert intent.
 * @returns Static recovery scope, or undefined when the host has not opted in. */
export function mindMapRecoveryFor(owner: object, request: MindMapEditRequest): MindEditorRecoveryOptions | undefined {
  const binding = bindings.get(owner), documentId = binding?.documentId();
  if (!binding || !documentId) return undefined;
  return { namespace: binding.namespace, documentId, targetId: request.document.id,
    insertion: request.intent === "insert", ...(binding.store ? { store: binding.store } : {}) };
}
