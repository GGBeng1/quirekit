import {
  createQuireSelectionCommandHandledResult,
  createQuireSelectionCommandUnhandledResult
} from "../../result";
import type {
  QuireSelectionCommandDispatchResult,
  QuireSelectionDomainCommandConsumer,
  QuireSelectionDomainCommandDispatchOptions
} from "../../types";
import {
  dispatchQuireStructuralCopyCommand,
  dispatchQuireStructuralCutCommand,
  dispatchQuireStructuralPasteCommand
} from "./clipboard";
import { dispatchQuireStructuralDeleteCommand } from "./delete";
import {
  isQuireStructuralSelectionCommandRoute,
  isQuireStructuralSelectionMatched
} from "./match";
import type { QuireStructuralSelectionCommandRoute } from "./types";

/** Selection-domain consumer for structural selection routes. */
export const structuralSelectionCommandConsumer: QuireSelectionDomainCommandConsumer = {
  name: "structural-domain",
  intents: ["copy", "cut", "delete", "paste", "text-mutation"],
  routeKinds: ["table-cells", "node", "document"],
  handle: dispatchQuireStructuralSelectionCommand
};

/**
 * Handles structural selection commands before generic text fallback.
 *
 * @param options - Routed selection command context.
 * @returns Selection-domain dispatch result for structural routes.
 */
function dispatchQuireStructuralSelectionCommand(
  options: QuireSelectionDomainCommandDispatchOptions
): QuireSelectionCommandDispatchResult {
  const { commandRoute } = options;

  if (!isQuireStructuralSelectionCommandRoute(commandRoute)) {
    return createQuireSelectionCommandUnhandledResult(commandRoute);
  }

  if (!isQuireStructuralSelectionMatched(commandRoute)) {
    return dispatchQuireStructuralSelectionMismatch(options, commandRoute);
  }

  return dispatchQuireMatchedStructuralSelectionCommand(options, commandRoute);
}

/**
 * Dispatches a structural command after route and selection validation.
 *
 * @param options - Routed selection command context.
 * @param commandRoute - Validated structural command route.
 * @returns Structural command dispatch result.
 */
function dispatchQuireMatchedStructuralSelectionCommand(
  options: QuireSelectionDomainCommandDispatchOptions,
  commandRoute: QuireStructuralSelectionCommandRoute
): QuireSelectionCommandDispatchResult {
  switch (commandRoute.intent) {
    case "copy":
      return dispatchQuireStructuralCopyCommand(options, commandRoute);
    case "cut":
      return dispatchQuireStructuralCutCommand(options, commandRoute);
    case "delete":
      return dispatchQuireStructuralDeleteCommand(options, commandRoute);
    case "paste":
      return dispatchQuireStructuralPasteCommand(options, commandRoute);
    case "text-mutation":
      return dispatchQuireStructuralTextMutationCommand(options, commandRoute);
    default:
      return createQuireSelectionCommandUnhandledResult(commandRoute);
  }
}

/**
 * Handles a route/selection mismatch as a diagnostic migration gap.
 *
 * @param options - Routed selection command context.
 * @param commandRoute - Structural command route that failed validation.
 * @returns Handled mismatch result that prevents generic text fallback.
 */
function dispatchQuireStructuralSelectionMismatch(
  options: QuireSelectionDomainCommandDispatchOptions,
  commandRoute: QuireStructuralSelectionCommandRoute
): QuireSelectionCommandDispatchResult {
  options.clipboardEvent?.preventDefault?.();

  return createQuireSelectionCommandHandledResult(commandRoute, {
    consumer: "structural-domain",
    effect: "selection-mismatch",
    docChanged: false
  });
}

/**
 * Blocks direct text mutation across structural selections.
 *
 * @param options - Routed selection command context.
 * @param commandRoute - Structural command route receiving text mutation.
 * @returns Blocked-structural result for structural text mutation.
 */
function dispatchQuireStructuralTextMutationCommand(
  options: QuireSelectionDomainCommandDispatchOptions,
  commandRoute: QuireStructuralSelectionCommandRoute
): QuireSelectionCommandDispatchResult {
  options.clipboardEvent?.preventDefault?.();

  return createQuireSelectionCommandHandledResult(commandRoute, {
    consumer: "structural-domain",
    effect: "blocked-structural",
    docChanged: false
  });
}
