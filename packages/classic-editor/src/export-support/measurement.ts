import type { QuireTextMeasurer } from "@quirekit/layout/text";
import { tryCreateQuireBrowserTextMeasurer } from "@quirekit/renderer";

/**
 * Tries to create the detached Canvas measurer used by browser export passes.
 *
 * Format adapters remain responsible for turning an unavailable context into
 * their own product-facing error or diagnostic.
 *
 * @param ownerDocument - Browser document allowed to create the detached canvas.
 * @returns Canvas-backed text measurer, or undefined when unavailable.
 */
export function tryCreateClassicEditorDetachedCanvasTextMeasurer(
  ownerDocument: Document | undefined
): QuireTextMeasurer | undefined {
  if (ownerDocument === undefined) return undefined;
  return tryCreateQuireBrowserTextMeasurer({ ownerDocument });
}
