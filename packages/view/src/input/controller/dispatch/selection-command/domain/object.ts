import type {
  QuireSelectionCommandDispatchResult,
  QuireSelectionDomainCommandConsumer,
  QuireSelectionDomainCommandDispatchOptions
} from "../types";
import { dispatchQuireSourceRangeSelectionCommand } from "./source-range";

/** Selection-domain consumer for object-like routes. */
export const objectSelectionCommandConsumer: QuireSelectionDomainCommandConsumer = {
  name: "object-domain",
  intents: ["copy", "cut", "delete", "paste", "text-mutation"],
  routeKinds: ["object"],
  handle: dispatchQuireObjectSelectionCommand
};

/**
 * Handles object-like commands through canonical source and capability facts.
 *
 * @param options - Routed selection command context.
 * @returns Selection-domain dispatch result for object-domain command ownership.
 */
function dispatchQuireObjectSelectionCommand(
  options: QuireSelectionDomainCommandDispatchOptions
): QuireSelectionCommandDispatchResult {
  return dispatchQuireSourceRangeSelectionCommand(options, "object-domain");
}
