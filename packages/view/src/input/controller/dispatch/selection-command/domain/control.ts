import type {
  QuireSelectionCommandDispatchResult,
  QuireSelectionDomainCommandConsumer,
  QuireSelectionDomainCommandDispatchOptions
} from "../types";
import { dispatchQuireSourceRangeSelectionCommand } from "./source-range";

/** Selection-domain consumer for control routes. */
export const controlSelectionCommandConsumer: QuireSelectionDomainCommandConsumer = {
  name: "control-domain",
  intents: ["copy", "cut", "delete", "paste", "text-mutation"],
  routeKinds: ["control"],
  handle: dispatchQuireControlSelectionCommand
};

/**
 * Handles control commands through canonical source and capability facts.
 *
 * @param options - Routed selection command context.
 * @returns Selection-domain dispatch result for control-domain command ownership.
 */
function dispatchQuireControlSelectionCommand(
  options: QuireSelectionDomainCommandDispatchOptions
): QuireSelectionCommandDispatchResult {
  return dispatchQuireSourceRangeSelectionCommand(options, "control-domain");
}
