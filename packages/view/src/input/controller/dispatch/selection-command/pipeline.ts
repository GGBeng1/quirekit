import {
  controlSelectionCommandConsumer,
  fieldSelectionCommandConsumer,
  objectSelectionCommandConsumer,
  readonlyTextSelectionCommandConsumer,
  structuralSelectionCommandConsumer,
  unknownSelectionCommandConsumer
} from "./domain";
import { createQuireSelectionCommandUnhandledResult } from "./result";
import type {
  QuireSelectionCommandDispatchResult,
  QuireSelectionDomainCommandConsumer,
  QuireSelectionDomainCommandDispatchOptions
} from "./types";

const selectionDomainCommandConsumers: readonly QuireSelectionDomainCommandConsumer[] = [
  structuralSelectionCommandConsumer,
  readonlyTextSelectionCommandConsumer,
  objectSelectionCommandConsumer,
  fieldSelectionCommandConsumer,
  controlSelectionCommandConsumer,
  unknownSelectionCommandConsumer
];

/**
 * Dispatches a routed selection command through the domain command pipeline.
 *
 * @param options - Routed selection command context.
 * @returns Selection-domain dispatch result before generic fallback.
 */
export function dispatchQuireControllerSelectionDomainCommand(
  options: QuireSelectionDomainCommandDispatchOptions
): QuireSelectionCommandDispatchResult {
  for (const consumer of selectionDomainCommandConsumers) {
    if (!canConsumeQuireSelectionDomainCommand(consumer, options)) {
      continue;
    }

    const result = consumer.handle(options);

    if (result.handled) {
      return result;
    }
  }

  return createQuireSelectionCommandUnhandledResult(options.commandRoute);
}

/**
 * Checks whether a consumer owns a routed selection command.
 *
 * @param consumer - Candidate selection-domain consumer.
 * @param options - Routed selection command context.
 * @returns Whether the consumer should receive the command.
 */
function canConsumeQuireSelectionDomainCommand(
  consumer: QuireSelectionDomainCommandConsumer,
  options: QuireSelectionDomainCommandDispatchOptions
): boolean {
  return (
    consumer.intents.includes(options.commandRoute.intent) &&
    consumer.routeKinds.includes(options.commandRoute.kind)
  );
}
