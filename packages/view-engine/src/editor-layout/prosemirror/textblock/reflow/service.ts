import type { QuireBlockTextFlowReflow } from "../../../../layout/engine/block-types";

const nativeServices = new WeakSet<QuireBlockTextFlowReflow>();

/**
 * Records native source ownership without retaining a frame or a second cache.
 * @param service - Service constructed from the native textblock source.
 * @returns The same service identity.
 */
export function registerNativeTextblockReflow(
  service: QuireBlockTextFlowReflow
): QuireBlockTextFlowReflow {
  nativeServices.add(service);
  return service;
}

/**
 * Rebinds only known native services; decoration alone never collects source.
 * @param source - Previous source service used only for admission and row height.
 * @param resolve - Builds the current absolute source once on actual consumption.
 * @returns Lazy current-source service, or undefined for an unknown callback.
 */
export function rebindNativeTextblockReflow(
  source: QuireBlockTextFlowReflow,
  resolve: () => QuireBlockTextFlowReflow | undefined
): QuireBlockTextFlowReflow | undefined {
  if (!nativeServices.has(source)) return undefined;
  let current: QuireBlockTextFlowReflow | undefined;
  /** @returns Native service for the current immutable source position. */
  function read(): QuireBlockTextFlowReflow {
    current ??= resolve();
    if (current === undefined || !nativeServices.has(current)) {
      throw new Error("Current native textblock reflow source is unavailable");
    }
    return current;
  }
  return registerNativeTextblockReflow({
    lineHeight: source.lineHeight,
    /**
     * Reshapes the current source without changing physical slot authority.
     * @param slots - Current sibling-flow physical row slots.
     * @param signature - Exact signature owned by the slot producer.
     * @returns Current-position text and local exclusions.
     */
    reflow(slots, signature) { return read().reflow(slots, signature); },
    /**
     * Resolves current-source replacement extents for derived occurrences.
     * @param replacements - Current measured field extents.
     * @returns Current-position runs and fragments.
     */
    reflowInlineReplacements(replacements) {
      return read().reflowInlineReplacements(replacements);
    }
  });
}
