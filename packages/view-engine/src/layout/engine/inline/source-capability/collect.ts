import type { QuireLayoutBox } from "../../types";
import { createQuireInlineSourceCapabilitySignature } from "@quirekit/layout/inline";
import type { QuireInlineSourceCapabilitySidecar } from "./types";

/**
 * Collects View capability sidecars from regular and nested layout flows.
 *
 * Logical anchors and View capabilities travel as separate products. This
 * collector preserves that separation while enforcing one deterministic
 * sidecar per source anchor across repeated layout representations.
 *
 * @param box - Layout tree whose source capabilities should be collected.
 * @returns Sidecars in stable first-observed source order.
 */
export function collectQuireInlineSourceCapabilitySidecars(
  box: QuireLayoutBox
): readonly QuireInlineSourceCapabilitySidecar[] {
  const sidecars = new Map<string, QuireInlineSourceCapabilitySidecar>();
  collectBoxSidecars(box, sidecars);
  return [...sidecars.values()];
}

/**
 * Visits one regular box and all nested-flow source boxes.
 *
 * @param box - Current layout box.
 * @param sidecars - Collected products keyed by source anchor id.
 * @returns Nothing.
 */
function collectBoxSidecars(
  box: QuireLayoutBox,
  sidecars: Map<string, QuireInlineSourceCapabilitySidecar>
): void {
  for (const sidecar of box.sourceCapabilities ?? []) {
    appendSidecar(sidecar, sidecars);
  }

  for (const entry of box.subLayoutFragments ?? []) {
    for (const source of entry.subLayout.view.fragmentSources) {
      collectBoxSidecars(source.sourceBox, sidecars);
    }
  }

  for (const child of readChildren(box)) {
    collectBoxSidecars(child, sidecars);
  }
}

/**
 * Adds one sidecar or verifies an equivalent repeated representation.
 *
 * @param sidecar - View capability product to append.
 * @param sidecars - Collected products keyed by source anchor id.
 * @returns Nothing.
 */
function appendSidecar(
  sidecar: QuireInlineSourceCapabilitySidecar,
  sidecars: Map<string, QuireInlineSourceCapabilitySidecar>
): void {
  const current = sidecars.get(sidecar.sourceAnchorId);
  if (current === undefined) {
    sidecars.set(sidecar.sourceAnchorId, sidecar);
    return;
  }

  if (
    current.nodeType !== sidecar.nodeType
    || createQuireInlineSourceCapabilitySignature(current)
      !== createQuireInlineSourceCapabilitySignature(sidecar)
  ) {
    throw new RangeError(
      `Source anchor "${sidecar.sourceAnchorId}" has conflicting View capability sidecars.`
    );
  }
}

/**
 * Reads regular child boxes without widening the layout-box contract.
 *
 * @param box - Layout box to inspect.
 * @returns Regular child boxes, or an empty list for a leaf.
 */
function readChildren(box: QuireLayoutBox): readonly QuireLayoutBox[] {
  return "children" in box && Array.isArray(box.children) ? box.children : [];
}
