import type { QuireBeforeInputEvent, QuireEditorInputResult } from "../../types";
import {
  resolveQuireGenericCutCommandRoute,
  resolveQuireGenericPasteCommandRoute,
  resolveQuireSelectionBeforeInputClipboardCommandRoute,
  resolveQuireSelectionBeforeInputDeleteCommandRoute,
  resolveQuireSelectionBeforeInputTextMutationCommandRoute
} from "../command-routing";
import {
  dispatchQuireBeforeInputIntent,
  shouldIgnoreQuireBeforeInputDuringComposition
} from "../before-input";
import type {
  QuireBeforeInputClipboardIntent,
  QuireBeforeInputDeleteInputType,
  QuireBeforeInputTextMutationInputType
} from "../before-input-intent";
import {
  dispatchQuireControllerSelectionClipboardCommand,
  dispatchQuireControllerSelectionDeleteCommand,
  dispatchQuireControllerSelectionTextMutationCommand
} from "../dispatch/selection-command";
import { dispatchQuireBeforeInputProps } from "../events/plugin";
import type { QuireEditorInputControllerRuntime } from "../runtime";
import { handleQuireControllerTextInput } from "./text";

/**
 * Handles a beforeinput-style editing intent.
 *
 * @param runtime - Shared input-controller runtime.
 * @param event - DOM-light beforeinput event.
 * @returns Whether the intent was handled and whether the document changed.
 */
export function handleQuireControllerBeforeInput(
  runtime: QuireEditorInputControllerRuntime,
  event: QuireBeforeInputEvent
): QuireEditorInputResult {
  if (
    shouldIgnoreQuireBeforeInputDuringComposition(
      event,
      runtime.composition.composing
    )
  ) {
    return { handled: false, docChanged: false };
  }

  const result = runtime.captureInputResult(() => {
    if (dispatchQuireBeforeInputProps(runtime.createPluginEventContext(), event)) {
      return true;
    }

    return dispatchQuireBeforeInputIntent({
      event,
      handleTextInput: (text) =>
        handleQuireControllerTextInput(runtime, text).handled,
      handleTextMutationInput: (inputType) =>
        handleQuireControllerBeforeInputTextMutation(runtime, inputType),
      handleDeleteInput: (inputType) =>
        handleQuireControllerBeforeInputDelete(runtime, inputType),
      handleClipboardInput: (intent) =>
        handleQuireControllerBeforeInputClipboard(runtime, intent),
      dispatchKeyDown: (keyboardEvent) => runtime.dispatchKeyDown(keyboardEvent)
    });
  });

  if (result.handled) {
    event.preventDefault?.();
  }

  return result;
}

/**
 * Handles beforeinput text mutation through the selection-command pipeline.
 *
 * @param runtime - Shared input-controller runtime.
 * @param inputType - Text mutation inputType requested by beforeinput.
 * @returns Whether text mutation was handled before keyboard fallback.
 */
function handleQuireControllerBeforeInputTextMutation(
  runtime: QuireEditorInputControllerRuntime,
  inputType: QuireBeforeInputTextMutationInputType
): boolean {
  const scope = runtime.resolveCommandRoutingScope();
  const route = resolveQuireSelectionBeforeInputTextMutationCommandRoute(
    scope,
    { inputType }
  );

  if (!route) {
    return false;
  }

  return dispatchQuireControllerSelectionTextMutationCommand(runtime, route)
    .handled;
}

/**
 * Handles beforeinput clipboard intents through selection-command guards.
 *
 * @param runtime - Shared input-controller runtime.
 * @param intent - Clipboard command requested by beforeinput.
 * @returns Whether clipboard beforeinput was handled before native fallback.
 */
function handleQuireControllerBeforeInputClipboard(
  runtime: QuireEditorInputControllerRuntime,
  intent: QuireBeforeInputClipboardIntent
): boolean {
  const scope = runtime.resolveCommandRoutingScope();
  const route = resolveQuireSelectionBeforeInputClipboardCommandRoute(
    scope,
    { inputType: intent.inputType }
  );

  if (!route) {
    return false;
  }

  const selectionCommandResult =
    dispatchQuireControllerSelectionClipboardCommand(runtime, route, {
      clipboardData: null,
      inputValue: null
    });

  if (selectionCommandResult.handled) {
    return true;
  }

  const genericRoute = intent.command === "cut"
    ? resolveQuireGenericCutCommandRoute(scope, route)
    : resolveQuireGenericPasteCommandRoute(scope, route);

  return genericRoute.kind !== "allow-text-mutation";
}

/**
 * Handles beforeinput deletion through the selection-command pipeline.
 *
 * @param runtime - Shared input-controller runtime.
 * @param inputType - Deletion inputType requested by beforeinput.
 * @returns Whether deletion was handled before keyboard fallback.
 */
function handleQuireControllerBeforeInputDelete(
  runtime: QuireEditorInputControllerRuntime,
  inputType: QuireBeforeInputDeleteInputType
): boolean {
  const scope = runtime.resolveCommandRoutingScope();
  const route = resolveQuireSelectionBeforeInputDeleteCommandRoute(
    scope,
    { inputType }
  );

  if (!route) {
    return false;
  }

  return dispatchQuireControllerSelectionDeleteCommand(runtime, route).handled;
}
