import type { QuireKeyboardInputEvent } from "../../types";
import {
  resolveQuireBlockedGenericTextEditingCommandRoute,
  resolveQuireSelectionDeleteCommandRoute,
  resolveQuireSelectionTextEditingCommandRoute
} from "../command-routing";
import { createQuireKeyboardSelectionTransaction } from "../../keyboard-selection";
import { isSelectAllShortcut } from "../../keyboard-selection/shortcuts";
import { isQuireOwnedNavigationKey } from "../../keyboard-navigation";
import { dispatchQuireKeyDownProps } from "../events/plugin";
import { dispatchQuireFallbackKey } from "../fallback";
import {
  dispatchQuireControllerSelectionDeleteCommand,
  dispatchQuireControllerSelectionTextMutationCommand
} from "./selection-command";
import { resolveQuireDocumentProfile, type QuireCommandRoutingScope } from "@quirekit/view-engine";
import type { QuireEditorInputControllerRuntime } from "../runtime";

/**
 * Routes a keyboard event to PM keydown props and canvas fallbacks.
 *
 * @param runtime - Shared input-controller runtime.
 * @param event - DOM-light keyboard event.
 * @returns Whether the key was handled.
 */
export function dispatchQuireControllerKeyDown(
  runtime: QuireEditorInputControllerRuntime,
  event: QuireKeyboardInputEvent
): boolean {
  const scope = runtime.resolveCommandRoutingScope();
  const deleteRoute = resolveQuireSelectionDeleteCommandRoute(scope, event);

  if (
    deleteRoute &&
    dispatchQuireControllerSelectionDeleteCommand(runtime, deleteRoute).handled
  ) {
    return true;
  }

  if (shouldBlockQuireControllerTextEditingCommand(runtime, scope, event)) {
    return true;
  }

  if (dispatchQuireControllerKeyboardSelection(runtime, event)) {
    return true;
  }

  if (dispatchQuireKeyDownProps(runtime.createPluginEventContext(), event)) {
    return true;
  }

  return dispatchQuireControllerFallbackKey(runtime, event);
}

/**
 * Checks text-editing keydown routing before generic PM editing runs.
 *
 * @param runtime - Shared input-controller runtime.
 * @param scope - Active command routing scope.
 * @param event - Keyboard event-like object.
 * @returns Whether the generic text edit should be consumed.
 */
function shouldBlockQuireControllerTextEditingCommand(
  runtime: QuireEditorInputControllerRuntime,
  scope: QuireCommandRoutingScope,
  event: QuireKeyboardInputEvent
): boolean {
  const commandRoute = resolveQuireSelectionTextEditingCommandRoute(scope, event);

  if (!commandRoute) {
    return false;
  }

  if (
    dispatchQuireControllerSelectionTextMutationCommand(runtime, commandRoute)
      .handled
  ) {
    return true;
  }

  return resolveQuireBlockedGenericTextEditingCommandRoute(
    scope,
    event,
    commandRoute
  ) !== null;
}

/**
 * Applies keyboard-driven selection movement when the key is owned by canvas.
 *
 * @param runtime - Shared input-controller runtime.
 * @param event - Keyboard event-like object.
 * @returns Whether a selection transaction was dispatched.
 */
export function dispatchQuireControllerKeyboardSelection(
  runtime: QuireEditorInputControllerRuntime,
  event: QuireKeyboardInputEvent
): boolean {
  const storyCommandBoundary = runtime.resolveStoryCommandBoundary();
  const selectionScopeBoundary = runtime.resolveSelectionScopeBoundary();
  const transaction = createQuireKeyboardSelectionTransaction({
    state: runtime.editor.state.pm,
    event,
    resolveVerticalCaretPosition: runtime.resolveVerticalCaretPosition,
    resolveLineBoundaryPosition: runtime.resolveLineBoundaryPosition,
    tableModel: resolveQuireDocumentProfile(runtime.editor.extensionManager).tableModel,
    ...(storyCommandBoundary === null ? {} : { storyCommandBoundary }),
    ...(selectionScopeBoundary === null ? {} : { selectionScopeBoundary })
  });

  if (!transaction) {
    return (
      selectionScopeBoundary !== null
      || storyCommandBoundary !== null
    ) && (
      isQuireOwnedNavigationKey(event)
      || isSelectAllShortcut(event)
    );
  }

  runtime.dispatchTransaction(transaction);
  return true;
}

/**
 * Checks whether a keydown event belongs to browser-owned composition.
 *
 * @param runtime - Shared input-controller runtime.
 * @param event - Keyboard event to inspect.
 * @returns Whether the event should bypass PM keymaps and canvas fallbacks.
 */
export function shouldIgnoreQuireKeyDownDuringComposition(
  runtime: QuireEditorInputControllerRuntime,
  event: QuireKeyboardInputEvent
): boolean {
  return runtime.composition.composing || event.isComposing === true || event.keyCode === 229;
}

/**
 * Handles editing keys that normally rely on browser DOM editing.
 *
 * @param runtime - Shared input-controller runtime.
 * @param event - Keyboard event-like object.
 * @returns Whether a fallback handled the key.
 */
function dispatchQuireControllerFallbackKey(
  runtime: QuireEditorInputControllerRuntime,
  event: QuireKeyboardInputEvent
): boolean {
  return dispatchQuireFallbackKey({
    editor: runtime.editor,
    event,
    dispatchTransaction: (transaction) => {
      runtime.dispatchTransaction(transaction);
    },
    dispatchKeyboardSelection: (keyboardEvent) => {
      return dispatchQuireControllerKeyboardSelection(runtime, keyboardEvent);
    }
  });
}
