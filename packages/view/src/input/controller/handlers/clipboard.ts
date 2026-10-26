import type { QuireClipboardEvent, QuireEditorInputResult } from "../../types";
import {
  handleQuireControllerCopy,
  handleQuireControllerCut,
  handleQuireControllerPaste
} from "../events/clipboard";
import {
  resolveQuireBlockedGenericCutCommandRoute,
  resolveQuireBlockedGenericPasteCommandRoute,
  resolveQuireSelectionCopyCommandRoute,
  resolveQuireSelectionCutCommandRoute,
  resolveQuireSelectionPasteCommandRoute
} from "../command-routing";
import {
  dispatchQuireControllerSelectionClipboardCommand,
  readQuireSelectionCommandInputResult
} from "../dispatch/selection-command";
import type { QuireEditorInputControllerRuntime } from "../runtime";

/**
 * Handles copying the current editor selection as rich clipboard data.
 *
 * @param runtime - Shared input-controller runtime.
 * @param event - Clipboard event carrying a writable data adapter.
 * @returns Whether copy data was written.
 */
export function handleQuireControllerCopyInput(
  runtime: QuireEditorInputControllerRuntime,
  event: QuireClipboardEvent
): QuireEditorInputResult {
  const scope = runtime.resolveCommandRoutingScope();
  const route = resolveQuireSelectionCopyCommandRoute(scope);
  const selectionCommandResult =
    dispatchQuireControllerSelectionClipboardCommand(runtime, route, event);
  const inputResult =
    readQuireSelectionCommandInputResult(selectionCommandResult);

  if (inputResult) {
    return inputResult;
  }

  switch (route.kind) {
    case "editable-text":
    case "readonly-text":
    case "table-cells":
    case "node":
    case "object":
    case "field":
    case "control":
    case "document":
    case "unknown":
      return handleQuireControllerCopy({
        editor: runtime.editor,
        getInteractionSnapshot: runtime.getInteractionSnapshot,
        commandScope: scope,
        clipboardOutputStrategy: runtime.clipboardOutputStrategy,
        storyCommandBoundary: runtime.resolveStoryCommandBoundary() ?? undefined
      }, event);
  }
}

/**
 * Handles cutting the current editor selection as rich clipboard data.
 *
 * @param runtime - Shared input-controller runtime.
 * @param event - Clipboard event carrying a writable data adapter.
 * @returns Whether cut data was written and the selection deleted.
 */
export function handleQuireControllerCutInput(
  runtime: QuireEditorInputControllerRuntime,
  event: QuireClipboardEvent
): QuireEditorInputResult {
  const scope = runtime.resolveCommandRoutingScope();
  const route = resolveQuireSelectionCutCommandRoute(scope);
  const selectionCommandResult =
    dispatchQuireControllerSelectionClipboardCommand(runtime, route, event);
  const inputResult =
    readQuireSelectionCommandInputResult(selectionCommandResult);

  if (inputResult) {
    return inputResult;
  }

  if (resolveQuireBlockedGenericCutCommandRoute(scope, route) !== null) {
    event.preventDefault?.();
    return { handled: true, docChanged: false };
  }

  switch (route.kind) {
    case "editable-text":
    case "readonly-text":
    case "table-cells":
    case "node":
    case "object":
    case "field":
    case "control":
    case "document":
    case "unknown":
      return handleQuireControllerCut({
        editor: runtime.editor,
        getInteractionSnapshot: runtime.getInteractionSnapshot,
        commandScope: scope,
        clipboardOutputStrategy: runtime.clipboardOutputStrategy,
        storyCommandBoundary: runtime.resolveStoryCommandBoundary() ?? undefined,
        captureInputResult: (dispatch) => runtime.captureInputResult(dispatch),
        dispatchTransaction: (transaction) => {
          runtime.dispatchTransaction(transaction);
        }
      }, event);
  }
}

/**
 * Handles pasting rich clipboard data into the current editor selection.
 *
 * @param runtime - Shared input-controller runtime.
 * @param event - Clipboard event carrying readable plain text.
 * @returns Whether paste text was inserted.
 */
export function handleQuireControllerPasteInput(
  runtime: QuireEditorInputControllerRuntime,
  event: QuireClipboardEvent
): QuireEditorInputResult {
  const scope = runtime.resolveCommandRoutingScope();
  const route = resolveQuireSelectionPasteCommandRoute(scope);
  const selectionCommandResult =
    dispatchQuireControllerSelectionClipboardCommand(runtime, route, event);
  const inputResult =
    readQuireSelectionCommandInputResult(selectionCommandResult);

  if (inputResult) {
    return inputResult;
  }

  if (resolveQuireBlockedGenericPasteCommandRoute(scope, route) !== null) {
    event.preventDefault?.();
    return { handled: true, docChanged: false };
  }

  switch (route.kind) {
    case "editable-text":
    case "readonly-text":
    case "table-cells":
    case "node":
    case "object":
    case "field":
    case "control":
    case "document":
    case "unknown":
      return handleQuireControllerPaste(
        {
          editor: runtime.editor,
          captureInputResult: (dispatch) => runtime.captureInputResult(dispatch),
          dispatchTransaction: (transaction) => {
            runtime.dispatchTransaction(transaction);
          }
        },
        event
      );
  }
}
