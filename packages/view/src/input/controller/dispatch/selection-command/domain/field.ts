import type {
  QuireSelectionCommandDispatchResult,
  QuireSelectionDomainCommandConsumer,
  QuireSelectionDomainCommandDispatchOptions
} from "../types";
import { dispatchQuireSourceRangeSelectionCommand } from "./source-range";

/** Selection-domain consumer for field routes. */
export const fieldSelectionCommandConsumer: QuireSelectionDomainCommandConsumer = {
  name: "field-domain",
  intents: ["copy", "cut", "delete", "paste", "text-mutation"],
  routeKinds: ["field"],
  handle: dispatchQuireFieldSelectionCommand
};

/**
 * Handles field commands through canonical source and capability facts.
 *
 * @param options - Routed selection command context.
 * @returns Selection-domain dispatch result for field-domain command ownership.
 */
function dispatchQuireFieldSelectionCommand(
  options: QuireSelectionDomainCommandDispatchOptions
): QuireSelectionCommandDispatchResult {
  return dispatchQuireSourceRangeSelectionCommand(options, "field-domain");
}
