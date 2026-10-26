import type { QuireKitDrawerCloseReason, QuireKitDrawerCloseRequest, QuireKitDrawerRootApi } from "../../components/drawer";
import type { DrawerCloseBoundaryOptions } from "./types";

/**
 * Creates a synchronous close gate without owning a second open state machine.
 * @param options - Current model, request notification, and accepted transition.
 * @returns The common task and interaction close entry.
 */
export function createDrawerCloseBoundary(options: DrawerCloseBoundaryOptions): QuireKitDrawerRootApi {
  let requesting = false;

  /**
   * Keeps reentrant listeners from executing or closing a task twice.
   * @param reason - Entry requesting the transition.
   * @returns Whether the current request was accepted.
   */
  function requestClose(reason: QuireKitDrawerCloseReason = "programmatic"): boolean {
    if (requesting || !options.isOpen()) return false;
    requesting = true;
    let prevented = false;
    const request: QuireKitDrawerCloseRequest = {
      reason,
      get defaultPrevented() { return prevented; },
      /** Rejects this close intent before the model is updated. */
      preventDefault() { prevented = true; }
    };
    try {
      options.notify(request);
      if (prevented) return false;
      if (options.isOpen()) options.close();
      return true;
    } finally {
      requesting = false;
    }
  }

  return { requestClose };
}
