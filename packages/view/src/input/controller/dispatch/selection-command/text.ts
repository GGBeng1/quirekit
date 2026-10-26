import type { QuireSelectionCommandRoute } from "@quirekit/view-engine";
import type { QuireEditorInputControllerRuntime } from "../../runtime";
import type { QuireSelectionCommandDispatchResult } from "./types";
import { dispatchQuireControllerSelectionDomainCommand } from "./pipeline";

/**
 * Dispatches selection-domain text mutation commands before generic text fallback.
 *
 * @param runtime - Shared input-controller runtime.
 * @param commandRoute - Routed selection command facts.
 * @returns Selection-domain dispatch result for the text mutation.
 */
export function dispatchQuireControllerSelectionTextMutationCommand(
  runtime: QuireEditorInputControllerRuntime,
  commandRoute: QuireSelectionCommandRoute
): QuireSelectionCommandDispatchResult {
  return dispatchQuireControllerSelectionDomainCommand({
    runtime,
    commandRoute
  });
}
