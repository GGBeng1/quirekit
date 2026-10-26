import type { QuireSelectionCommandRoute } from "@quirekit/view-engine";
import type { QuireClipboardEvent } from "../../../types";
import type { QuireEditorInputControllerRuntime } from "../../runtime";
import type { QuireSelectionCommandDispatchResult } from "./types";
import { dispatchQuireControllerSelectionDomainCommand } from "./pipeline";

/**
 * Dispatches selection-domain clipboard commands before generic clipboard fallback.
 *
 * @param runtime - Shared input-controller runtime.
 * @param commandRoute - Routed selection command facts.
 * @param event - Clipboard event carrying readable or writable data.
 * @returns Selection-domain dispatch result for the clipboard command.
 */
export function dispatchQuireControllerSelectionClipboardCommand(
  runtime: QuireEditorInputControllerRuntime,
  commandRoute: QuireSelectionCommandRoute,
  event: QuireClipboardEvent
): QuireSelectionCommandDispatchResult {
  return dispatchQuireControllerSelectionDomainCommand({
    runtime,
    commandRoute,
    clipboardEvent: event
  });
}
