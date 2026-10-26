import { AllSelection, NodeSelection } from "@quirekit/pm";
import { BlockSelection } from "@quirekit/core";
import { QuireStructuredRangeSelection, readQuireTableCellSelection, type QuireSelectionCommandRoute } from "@quirekit/view-engine";
import type { QuireStructuralSelectionCommandRoute } from "./types";

/**
 * Checks whether a route belongs to the structural selection domain.
 *
 * @param commandRoute - Selection command route to inspect.
 * @returns Whether the route is structural.
 */
export function isQuireStructuralSelectionCommandRoute(
  commandRoute: QuireSelectionCommandRoute
): commandRoute is QuireStructuralSelectionCommandRoute {
  return (
    commandRoute.kind === "table-cells" ||
    commandRoute.kind === "node" ||
    commandRoute.kind === "document"
  );
}

/**
 * Checks whether a structural route carries the matching selection type.
 *
 * @param commandRoute - Structural command route to validate.
 * @returns Whether the route can safely mutate or serialize its selection.
 */
export function isQuireStructuralSelectionMatched(
  commandRoute: QuireStructuralSelectionCommandRoute
): boolean {
  switch (commandRoute.kind) {
    case "table-cells":
      return commandRoute.selectionDomain === "cell" &&
        readQuireTableCellSelection(commandRoute.selection) !== null;
    case "node":
      return commandRoute.selectionDomain === "node" &&
        commandRoute.selection instanceof NodeSelection;
    case "document":
      return commandRoute.selectionDomain === "document" &&
        (commandRoute.selection instanceof AllSelection || commandRoute.selection instanceof BlockSelection
          || commandRoute.selection instanceof QuireStructuredRangeSelection);
  }
}
