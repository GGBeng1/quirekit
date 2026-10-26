import type { QuireSelectionCommandRoute } from "@quirekit/view-engine";
import type { QuireEditorInputControllerRuntime } from "../../runtime";
import type { QuireSelectionCommandDispatchResult } from "./types";
import { dispatchQuireControllerSelectionDomainCommand } from "./pipeline";

/**
 * Dispatches delete commands owned by the active selection command domain.
 *
 * @param runtime - Shared input-controller runtime.
 * @param commandRoute - Routed delete command facts.
 * @returns Selection-domain dispatch result for the delete command.
 */
export function dispatchQuireControllerSelectionDeleteCommand(
  runtime: QuireEditorInputControllerRuntime,
  commandRoute: QuireSelectionCommandRoute
): QuireSelectionCommandDispatchResult {
  return dispatchQuireControllerSelectionDomainCommand({
    runtime,
    commandRoute
  });
}
