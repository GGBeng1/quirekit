import type {
  QuireDocumentSelectionCommandRoute,
  QuireNodeSelectionCommandRoute,
  QuireTableCellsSelectionCommandRoute
} from "@quirekit/view-engine";
import {
  createQuireSelectionCommandHandledResult
} from "../../result";
import type {
  QuireSelectionCommandDispatchResult,
  QuireSelectionDomainCommandDispatchOptions
} from "../../types";
import type { QuireStructuralSelectionCommandRoute } from "./types";

/**
 * Dispatches structural delete commands for table-cell, node, and document routes.
 *
 * @param options - Routed selection command context.
 * @param commandRoute - Structural command route being deleted.
 * @returns Selection-domain dispatch result for structural delete.
 */
export function dispatchQuireStructuralDeleteCommand(
  options: QuireSelectionDomainCommandDispatchOptions,
  commandRoute: QuireStructuralSelectionCommandRoute
): QuireSelectionCommandDispatchResult {
  switch (commandRoute.kind) {
    case "table-cells":
      return dispatchQuireTableCellDeleteCommand(options, commandRoute);
    case "node":
      return dispatchQuireNodeDeleteCommand(options, commandRoute);
    case "document":
      return dispatchQuireDocumentDeleteCommand(options, commandRoute);
  }
}

/**
 * Deletes a structural table-cell selection.
 *
 * @param options - Routed selection command context.
 * @param commandRoute - Routed table-cell command facts.
 * @returns Selection-domain dispatch result for the table-cell delete.
 */
function dispatchQuireTableCellDeleteCommand(
  options: QuireSelectionDomainCommandDispatchOptions,
  commandRoute: QuireTableCellsSelectionCommandRoute
): QuireSelectionCommandDispatchResult {
  const transaction = options.runtime.editor.state.pm.tr;

  commandRoute.selection.replace(transaction);
  options.runtime.dispatchTransaction(transaction);
  return createQuireSelectionCommandHandledResult(commandRoute, {
    consumer: "structural-domain",
    effect: "document-change",
    docChanged: true
  });
}

/**
 * Deletes a structural ProseMirror node selection.
 *
 * @param options - Routed selection command context.
 * @param commandRoute - Routed node command facts.
 * @returns Selection-domain dispatch result for the node delete.
 */
function dispatchQuireNodeDeleteCommand(
  options: QuireSelectionDomainCommandDispatchOptions,
  commandRoute: QuireNodeSelectionCommandRoute
): QuireSelectionCommandDispatchResult {
  options.runtime.dispatchTransaction(
    options.runtime.editor.state.pm.tr.deleteSelection()
  );
  return createQuireSelectionCommandHandledResult(commandRoute, {
    consumer: "structural-domain",
    effect: "document-change",
    docChanged: true
  });
}

/**
 * Deletes a whole-document selection.
 *
 * @param options - Routed selection command context.
 * @param commandRoute - Routed document command facts.
 * @returns Selection-domain dispatch result for the document delete.
 */
function dispatchQuireDocumentDeleteCommand(
  options: QuireSelectionDomainCommandDispatchOptions,
  commandRoute: QuireDocumentSelectionCommandRoute
): QuireSelectionCommandDispatchResult {
  options.runtime.dispatchTransaction(
    options.runtime.editor.state.pm.tr.deleteSelection()
  );
  return createQuireSelectionCommandHandledResult(commandRoute, {
    consumer: "structural-domain",
    effect: "document-change",
    docChanged: true
  });
}
