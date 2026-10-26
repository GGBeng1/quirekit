import type {
  ClassicPrimitiveOverlayIsolationTarget,
  ClassicPrimitiveOverlayRegistration
} from "../types";
import type { ClassicPrimitiveOverlayEntry } from "./entries";

/** Exact pre-modal browser state. */
interface IsolationSnapshot { readonly inert: boolean; readonly ariaHidden: string | null; }

/**
 * Creates the stable callback used by lifecycle helpers after stack mutations.
 *
 * @param entriesByRoot - Active root-local overlay entries.
 * @param snapshotsByRoot - Exact pre-modal states retained for restoration.
 * @returns Root-scoped modal reconciliation callback.
 */
export function createOverlayModalIsolationReconciler(
  entriesByRoot: ReadonlyMap<object, ReadonlyMap<string, ClassicPrimitiveOverlayEntry>>,
  snapshotsByRoot: Map<object, Map<ClassicPrimitiveOverlayIsolationTarget, IsolationSnapshot>>
): (root: object) => void {
  return (root) => reconcileOverlayModalIsolation(
    root,
    [...(entriesByRoot.get(root)?.values() ?? [])].map((entry) => entry.registration),
    snapshotsByRoot
  );
}

/** Reconciles active modal targets and restores targets no remaining modal requires. */
export function reconcileOverlayModalIsolation(
  root: object,
  registrations: readonly ClassicPrimitiveOverlayRegistration[],
  snapshotsByRoot: Map<object, Map<ClassicPrimitiveOverlayIsolationTarget, IsolationSnapshot>>
): void {
  const targets = new Set<ClassicPrimitiveOverlayIsolationTarget>();
  for (const registration of registrations) {
    for (const target of registration.modal?.isolationTargets ?? []) targets.add(target);
  }
  const snapshots = snapshotsByRoot.get(root) ?? new Map<ClassicPrimitiveOverlayIsolationTarget, IsolationSnapshot>();
  for (const [target, snapshot] of [...snapshots]) {
    if (targets.has(target)) continue;
    restoreIsolationTarget(target, snapshot);
    snapshots.delete(target);
  }
  for (const target of targets) {
    if (!snapshots.has(target)) snapshots.set(target, { inert: target.inert, ariaHidden: target.getAttribute("aria-hidden") });
    target.inert = true;
    target.setAttribute("aria-hidden", "true");
  }
  if (snapshots.size === 0) snapshotsByRoot.delete(root);
  else snapshotsByRoot.set(root, snapshots);
}

/** Restores initial inert and aria-hidden facts exactly. */
function restoreIsolationTarget(
  target: ClassicPrimitiveOverlayIsolationTarget,
  snapshot: IsolationSnapshot
): void {
  target.inert = snapshot.inert;
  if (snapshot.ariaHidden === null) target.removeAttribute("aria-hidden");
  else target.setAttribute("aria-hidden", snapshot.ariaHidden);
}
