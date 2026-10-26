import type { QuireEditorInputResult } from "../../types";
import {
  resolveQuireBlockedGenericTextMutationCommandRoute,
  resolveQuireSelectionTextMutationCommandRoute
} from "../command-routing";
import {
  dispatchQuireControllerSelectionTextMutationCommand,
  readQuireSelectionCommandInputResult
} from "../dispatch/selection-command";
import { dispatchQuireTextInputProps } from "../events/plugin";
import type { QuireEditorInputControllerRuntime } from "../runtime";

/**
 * Handles plain text input.
 *
 * @param runtime - Shared input-controller runtime.
 * @param text - Text to insert at the current selection.
 * @param compositionId - Optional PM composition id for history grouping.
 * @returns Whether the text was handled and whether the document changed.
 */
export function handleQuireControllerTextInput(
  runtime: QuireEditorInputControllerRuntime,
  text: string,
  compositionId?: number
): QuireEditorInputResult {
  if (text.length === 0 || runtime.composition.composing) {
    return { handled: false, docChanged: false };
  }

  const scope = runtime.resolveCommandRoutingScope();
  const route = resolveQuireSelectionTextMutationCommandRoute(scope);
  const selectionCommandResult =
    dispatchQuireControllerSelectionTextMutationCommand(runtime, route);
  const inputResult =
    readQuireSelectionCommandInputResult(selectionCommandResult);

  if (inputResult) {
    return inputResult;
  }

  if (resolveQuireBlockedGenericTextMutationCommandRoute(scope, route)) {
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
      return runtime.captureInputResult(() => {
        const { from, to } = runtime.editor.state.pm.selection;

        if (
          dispatchQuireTextInputProps(
            runtime.createPluginEventContext(),
            from,
            to,
            text
          )
        ) {
          return true;
        }

        runtime.dispatchTransaction(
          runtime.editor.state.pm.tr.insertText(text, from, to).scrollIntoView()
        );
        return true;
      }, compositionId);
  }
}
