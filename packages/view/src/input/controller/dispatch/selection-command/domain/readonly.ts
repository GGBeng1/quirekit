import { handleQuireControllerCopy } from "../../../events/clipboard";
import {
  createQuireSelectionCommandHandledResult
} from "../result";
import type {
  QuireSelectionCommandDispatchResult,
  QuireSelectionDomainCommandConsumer,
  QuireSelectionDomainCommandDispatchOptions
} from "../types";

/** Selection-domain consumer for readonly text routes. */
export const readonlyTextSelectionCommandConsumer: QuireSelectionDomainCommandConsumer = {
  name: "readonly-domain",
  intents: ["copy", "cut", "delete", "paste", "text-mutation"],
  routeKinds: ["readonly-text"],
  handle: dispatchQuireReadonlyTextSelectionCommand
};

/**
 * Handles readonly text commands before generic editing fallback.
 *
 * @param options - Routed selection command context.
 * @returns Dispatch result for readonly-domain command ownership.
 */
function dispatchQuireReadonlyTextSelectionCommand(
  options: QuireSelectionDomainCommandDispatchOptions
): QuireSelectionCommandDispatchResult {
  switch (options.commandRoute.intent) {
    case "copy":
      return dispatchQuireReadonlyClipboardCopyCommand(options);
    case "cut":
      return dispatchQuireReadonlyClipboardCopyCommand(options);
    default:
      options.clipboardEvent?.preventDefault?.();
      return createQuireSelectionCommandHandledResult(options.commandRoute, {
        consumer: "readonly-domain",
        effect: "blocked-readonly",
        docChanged: false
      });
  }
}

/**
 * Handles readonly copy and cut by writing clipboard data without mutating the document.
 *
 * @param options - Routed selection command context.
 * @returns Copy-only dispatch result for readonly copy or cut.
 */
function dispatchQuireReadonlyClipboardCopyCommand(
  options: QuireSelectionDomainCommandDispatchOptions
): QuireSelectionCommandDispatchResult {
  if (!options.clipboardEvent) {
    return createQuireSelectionCommandHandledResult(options.commandRoute, {
      consumer: "readonly-domain",
      effect: "copy-only",
      docChanged: false
    });
  }

  const copyResult = handleQuireControllerCopy(
    {
      editor: options.runtime.editor,
      getInteractionSnapshot: options.runtime.getInteractionSnapshot,
      commandScope: options.runtime.resolveCommandRoutingScope(),
      clipboardOutputStrategy: options.runtime.clipboardOutputStrategy
    },
    options.clipboardEvent
  );

  if (!copyResult.handled) {
    options.clipboardEvent.preventDefault?.();
  }

  return createQuireSelectionCommandHandledResult(options.commandRoute, {
    consumer: "readonly-domain",
    effect: "copy-only",
    docChanged: copyResult.docChanged
  });
}
