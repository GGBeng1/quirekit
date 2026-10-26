import {
  handleQuireControllerCopy,
  handleQuireControllerCut,
  handleQuireControllerPaste
} from "../../../../events/clipboard";
import {
  createQuireSelectionCommandHandledResult
} from "../../result";
import type {
  QuireSelectionCommandDispatchResult,
  QuireSelectionDomainCommandDispatchOptions
} from "../../types";
import type { QuireStructuralSelectionCommandRoute } from "./types";

/**
 * Handles structural copy by serializing the active structural selection.
 *
 * @param options - Routed selection command context.
 * @param commandRoute - Structural command route being copied.
 * @returns Copy-only result for structural selection copy.
 */
export function dispatchQuireStructuralCopyCommand(
  options: QuireSelectionDomainCommandDispatchOptions,
  commandRoute: QuireStructuralSelectionCommandRoute
): QuireSelectionCommandDispatchResult {
  if (!options.clipboardEvent) {
    return createQuireSelectionCommandHandledResult(commandRoute, {
      consumer: "structural-domain",
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

  return createQuireSelectionCommandHandledResult(commandRoute, {
    consumer: "structural-domain",
    effect: "copy-only",
    docChanged: copyResult.docChanged
  });
}

/**
 * Handles structural cut by copying and deleting the active structural selection.
 *
 * @param options - Routed selection command context.
 * @param commandRoute - Structural command route being cut.
 * @returns Document-change result when the structural selection was cut.
 */
export function dispatchQuireStructuralCutCommand(
  options: QuireSelectionDomainCommandDispatchOptions,
  commandRoute: QuireStructuralSelectionCommandRoute
): QuireSelectionCommandDispatchResult {
  if (!options.clipboardEvent?.clipboardData) {
    options.clipboardEvent?.preventDefault?.();
    return createQuireSelectionCommandHandledResult(commandRoute, {
      consumer: "structural-domain",
      effect: "blocked-structural",
      docChanged: false
    });
  }

  const cutResult = handleQuireControllerCut(
    {
      editor: options.runtime.editor,
      getInteractionSnapshot: options.runtime.getInteractionSnapshot,
      commandScope: options.runtime.resolveCommandRoutingScope(),
      clipboardOutputStrategy: options.runtime.clipboardOutputStrategy,
      captureInputResult: (dispatch) => options.runtime.captureInputResult(dispatch),
      dispatchTransaction: (transaction) => {
        options.runtime.dispatchTransaction(transaction);
      }
    },
    options.clipboardEvent
  );

  if (!cutResult.handled) {
    options.clipboardEvent.preventDefault?.();
    return createQuireSelectionCommandHandledResult(commandRoute, {
      consumer: "structural-domain",
      effect: "blocked-structural",
      docChanged: false
    });
  }

  return createQuireSelectionCommandHandledResult(commandRoute, {
    consumer: "structural-domain",
    effect: "document-change",
    docChanged: cutResult.docChanged
  });
}

/**
 * Handles structural paste by replacing the active structural selection.
 *
 * @param options - Routed selection command context.
 * @param commandRoute - Structural command route receiving paste.
 * @returns Document-change result when paste replaced the structural selection.
 */
export function dispatchQuireStructuralPasteCommand(
  options: QuireSelectionDomainCommandDispatchOptions,
  commandRoute: QuireStructuralSelectionCommandRoute
): QuireSelectionCommandDispatchResult {
  if (!options.clipboardEvent) {
    return createQuireSelectionCommandHandledResult(commandRoute, {
      consumer: "structural-domain",
      effect: "blocked-structural",
      docChanged: false
    });
  }

  const pasteResult = handleQuireControllerPaste(
    {
      editor: options.runtime.editor,
      captureInputResult: (dispatch) => options.runtime.captureInputResult(dispatch),
      dispatchTransaction: (transaction) => {
        options.runtime.dispatchTransaction(transaction);
      }
    },
    options.clipboardEvent
  );

  if (!pasteResult.handled) {
    options.clipboardEvent.preventDefault?.();
    return createQuireSelectionCommandHandledResult(commandRoute, {
      consumer: "structural-domain",
      effect: "blocked-structural",
      docChanged: false
    });
  }

  return createQuireSelectionCommandHandledResult(commandRoute, {
    consumer: "structural-domain",
    effect: "document-change",
    docChanged: pasteResult.docChanged
  });
}
