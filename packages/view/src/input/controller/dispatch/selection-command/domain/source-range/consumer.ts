import {
  createQuireSelectionCommandHandledResult
} from "../../result";
import type {
  QuireSelectionCommandDispatchResult,
  QuireSelectionDomainCommandDispatchOptions
} from "../../types";
import {
  dispatchQuireSourceRangeCopyCommand,
  dispatchQuireSourceRangeCutCommand
} from "./clipboard";
import { dispatchQuireSourceRangeDeleteCommand } from "./delete";

/**
 * Handles source-range-backed commands for commandable non-text targets.
 *
 * @param options - Routed selection command context.
 * @param consumer - Stable consumer label for diagnostics.
 * @returns Selection-domain dispatch result for the source-range command.
 */
export function dispatchQuireSourceRangeSelectionCommand(
  options: QuireSelectionDomainCommandDispatchOptions,
  consumer: string
): QuireSelectionCommandDispatchResult {
  switch (options.commandRoute.intent) {
    case "copy":
      return dispatchQuireSourceRangeCopyCommand(options, consumer);
    case "cut":
      return dispatchQuireSourceRangeCutCommand(options, consumer);
    case "delete":
      return dispatchQuireSourceRangeDeleteCommand(options, consumer);
    case "paste":
    case "text-mutation":
      options.clipboardEvent?.preventDefault?.();
      return createQuireSelectionCommandHandledResult(options.commandRoute, {
        consumer,
        effect: "unsupported-action",
        docChanged: false
      });
    default:
      return createQuireSelectionCommandHandledResult(options.commandRoute, {
        consumer,
        effect: "unsupported-action",
        docChanged: false
      });
  }
}
