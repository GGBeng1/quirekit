import {
  createQuireSelectionCommandHandledResult
} from "../result";
import type {
  QuireSelectionCommandDispatchResult,
  QuireSelectionDomainCommandConsumer,
  QuireSelectionDomainCommandDispatchOptions
} from "../types";

/** Selection-domain consumer for unknown routes. */
export const unknownSelectionCommandConsumer: QuireSelectionDomainCommandConsumer = {
  name: "unknown-domain",
  intents: ["copy", "cut", "delete", "paste", "text-mutation"],
  routeKinds: ["unknown"],
  handle: dispatchQuireUnknownSelectionCommand
};

/**
 * Handles unknown command routes conservatively before generic text fallback.
 *
 * @param options - Routed selection command context.
 * @returns Unknown-target result for unknown-domain command ownership.
 */
function dispatchQuireUnknownSelectionCommand(
  options: QuireSelectionDomainCommandDispatchOptions
): QuireSelectionCommandDispatchResult {
  options.clipboardEvent?.preventDefault?.();
  return createQuireSelectionCommandHandledResult(options.commandRoute, {
    consumer: "unknown-domain",
    effect: "unknown-target",
    docChanged: false
  });
}
