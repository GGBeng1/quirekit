import type { ClassicPrimitiveOverlayRegistration } from "../types";

/**
 * Copies and validates caller-owned facts before they enter the active stack.
 *
 * @param registration - Caller-owned overlay lifecycle facts.
 * @returns Frozen registration safe to retain across controlled updates.
 */
export function freezeOverlayRegistration(
  registration: ClassicPrimitiveOverlayRegistration
): ClassicPrimitiveOverlayRegistration {
  if (registration.id.length === 0) throw new Error("Overlay id must be non-empty.");
  if (registration.parentId === registration.id) {
    throw new Error("Overlay cannot parent itself.");
  }
  const modal = registration.modal === undefined ? undefined : Object.freeze({
    isolationTargets: Object.freeze([...registration.modal.isolationTargets])
  });
  return Object.freeze({ ...registration, modal });
}
