import {
  createQuireSelectionCommandHandledResult
} from "../../result";
import type {
  QuireSelectionCommandDispatchResult,
  QuireSelectionDomainCommandDispatchOptions
} from "../../types";
import { readQuireSourceRangeCommandGuard } from "./guard";
import type { QuireSourceRangeCommandRange } from "./types";

/**
 * Handles source-range delete by mutating the represented document range.
 *
 * @param options - Routed selection command context.
 * @param consumer - Stable consumer label for diagnostics.
 * @returns Document-change result when the source range was deleted.
 */
export function dispatchQuireSourceRangeDeleteCommand(
  options: QuireSelectionDomainCommandDispatchOptions,
  consumer: string
): QuireSelectionCommandDispatchResult {
  const guard = readQuireSourceRangeCommandGuard(
    options.commandRoute,
    "commandable"
  );

  if (guard.effect !== undefined) {
    return createQuireSelectionCommandHandledResult(options.commandRoute, {
      consumer,
      effect: guard.effect,
      docChanged: false
    });
  }

  const deleteResult = deleteQuireSourceRange(options, guard.range);

  return createQuireSelectionCommandHandledResult(options.commandRoute, {
    consumer,
    effect: "document-change",
    docChanged: deleteResult.docChanged
  });
}

/**
 * Deletes a validated source range through the input-controller transaction path.
 *
 * @param options - Routed selection command context.
 * @param range - Source range to delete.
 * @returns Controller input result captured around the deletion.
 */
export function deleteQuireSourceRange(
  options: QuireSelectionDomainCommandDispatchOptions,
  range: QuireSourceRangeCommandRange
): { readonly handled: boolean; readonly docChanged: boolean } {
  return options.runtime.captureInputResult(() => {
    options.runtime.dispatchTransaction(
      options.runtime.editor.state.pm.tr.delete(range.from, range.to)
    );
    return true;
  });
}
