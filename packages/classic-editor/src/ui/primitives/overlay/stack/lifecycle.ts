import type { ClassicPrimitiveOverlayCloseReason } from "../types";
import { childrenOfOverlay, type ClassicPrimitiveOverlayEntry } from "./entries";

/**
 * Closes a branch deepest-first and reconciles modal ownership after each removal.
 *
 * @param entriesByRoot - Mutable root-local stack storage.
 * @param root - Owning editor root.
 * @param id - Branch root identity.
 * @param reason - Explicit lifecycle reason.
 * @param restoreFocus - Whether the requested branch root returns focus.
 * @param reconcile - Root-local modal reconciliation callback.
 * @returns Nothing.
 */
export function closeOverlayBranch(
  entriesByRoot: Map<object, Map<string, ClassicPrimitiveOverlayEntry>>,
  root: object,
  id: string,
  reason: ClassicPrimitiveOverlayCloseReason,
  restoreFocus: boolean,
  reconcile: (root: object) => void
): void {
  const entries = entriesByRoot.get(root);
  const entry = entries?.get(id);
  if (entry === undefined || entries === undefined) return;
  for (const child of childrenOfOverlay(entries, id)) {
    closeOverlayBranch(
      entriesByRoot,
      root,
      child.registration.id,
      reason,
      false,
      reconcile
    );
  }
  entries.delete(id);
  if (entries.size === 0) entriesByRoot.delete(root);
  entry.registration.close(reason);
  if (restoreFocus) entry.registration.restoreFocus?.();
  reconcile(root);
}

/**
 * Removes a branch without invoking controlled close or focus callbacks.
 *
 * @param entriesByRoot - Mutable root-local stack storage.
 * @param root - Owning editor root.
 * @param id - Branch root to detach.
 * @returns Whether an active branch was removed.
 */
export function removeOverlayBranch(
  entriesByRoot: Map<object, Map<string, ClassicPrimitiveOverlayEntry>>,
  root: object,
  id: string
): boolean {
  const entries = entriesByRoot.get(root);
  if (entries === undefined || !entries.has(id)) return false;
  for (const child of childrenOfOverlay(entries, id)) {
    removeOverlayBranch(entriesByRoot, root, child.registration.id);
  }
  entries.delete(id);
  if (entries.size === 0) entriesByRoot.delete(root);
  return true;
}
