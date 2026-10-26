import {
  resolveQuireGenericEditCommandRoute,
  resolveQuireSelectionCommandRoute,
  type QuireCommandRoutingScope,
  type QuireGenericEditCommandRoute,
  type QuireSelectionCommandRoute
} from "@quirekit/view-engine";
import type { QuireBeforeInputEvent, QuireKeyboardInputEvent } from "../types";
import { classifyQuireBeforeInputIntent } from "./before-input-intent";

/**
 * Resolves the blocked generic text-editing route for keydown dispatch.
 *
 * @param scope - Active command routing scope.
 * @param event - Keyboard event that may request a text edit.
 * @param selectionRoute - Pre-resolved selection route for the same scope.
 * @returns Blocked generic edit route, or null when the key should continue.
 */
export function resolveQuireBlockedGenericTextEditingCommandRoute(
  scope: QuireCommandRoutingScope,
  event: QuireKeyboardInputEvent,
  selectionRoute?: QuireSelectionCommandRoute
): QuireGenericEditCommandRoute | null {
  const route = resolveQuireGenericTextEditingCommandRoute(
    scope,
    event,
    selectionRoute
  );

  return route?.kind === "block" ? route : null;
}

/**
 * Resolves a selection-domain command route for delete keys.
 *
 * @param scope - Active command routing scope.
 * @param event - Keyboard event that may request selection deletion.
 * @returns Routed selection command, or null when the key is not a delete key.
 */
export function resolveQuireSelectionDeleteCommandRoute(
  scope: QuireCommandRoutingScope,
  event: QuireKeyboardInputEvent
): QuireSelectionCommandRoute | null {
  if (!isQuireDeleteSelectionKey(event)) {
    return null;
  }

  return resolveQuireSelectionCommandRoute({ scope, intent: "delete" });
}

/**
 * Resolves a selection-domain command route for beforeinput deletion intents.
 *
 * @param scope - Active command routing scope.
 * @param event - beforeinput event that may request selection deletion.
 * @returns Routed selection command, or null when beforeinput is not deletion.
 */
export function resolveQuireSelectionBeforeInputDeleteCommandRoute(
  scope: QuireCommandRoutingScope,
  event: Pick<QuireBeforeInputEvent, "inputType">
): QuireSelectionCommandRoute | null {
  const intent = classifyQuireBeforeInputIntent(event);

  if (intent?.kind !== "delete") {
    return null;
  }

  return resolveQuireSelectionCommandRoute({ scope, intent: "delete" });
}

/**
 * Resolves a selection-domain command route for beforeinput text-mutation intents.
 *
 * @param scope - Active command routing scope.
 * @param event - beforeinput event that may request a text mutation.
 * @returns Routed selection command, or null when beforeinput is not a text mutation.
 */
export function resolveQuireSelectionBeforeInputTextMutationCommandRoute(
  scope: QuireCommandRoutingScope,
  event: Pick<QuireBeforeInputEvent, "inputType">
): QuireSelectionCommandRoute | null {
  const intent = classifyQuireBeforeInputIntent(event);

  if (intent?.kind !== "text-mutation") {
    return null;
  }

  return resolveQuireSelectionTextMutationCommandRoute(scope);
}

/**
 * Resolves a selection-domain command route for beforeinput clipboard intents.
 *
 * @param scope - Active command routing scope.
 * @param event - beforeinput event that may request a clipboard command.
 * @returns Routed selection command, or null when beforeinput is not clipboard.
 */
export function resolveQuireSelectionBeforeInputClipboardCommandRoute(
  scope: QuireCommandRoutingScope,
  event: Pick<QuireBeforeInputEvent, "inputType">
): QuireSelectionCommandRoute | null {
  const intent = classifyQuireBeforeInputIntent(event);

  if (intent?.kind !== "clipboard") {
    return null;
  }

  return resolveQuireSelectionCommandRoute({ scope, intent: intent.command });
}

/**
 * Resolves a selection-domain command route for clipboard copy.
 *
 * @param scope - Active command routing scope.
 * @returns Routed selection copy command.
 */
export function resolveQuireSelectionCopyCommandRoute(
  scope: QuireCommandRoutingScope
): QuireSelectionCommandRoute {
  return resolveQuireSelectionCommandRoute({ scope, intent: "copy" });
}

/**
 * Resolves a selection-domain command route for clipboard cut.
 *
 * @param scope - Active command routing scope.
 * @returns Routed selection cut command.
 */
export function resolveQuireSelectionCutCommandRoute(
  scope: QuireCommandRoutingScope
): QuireSelectionCommandRoute {
  return resolveQuireSelectionCommandRoute({ scope, intent: "cut" });
}

/**
 * Resolves a selection-domain command route for clipboard paste.
 *
 * @param scope - Active command routing scope.
 * @returns Routed selection paste command.
 */
export function resolveQuireSelectionPasteCommandRoute(
  scope: QuireCommandRoutingScope
): QuireSelectionCommandRoute {
  return resolveQuireSelectionCommandRoute({ scope, intent: "paste" });
}

/**
 * Resolves a selection-domain command route for text mutation.
 *
 * @param scope - Active command routing scope.
 * @returns Routed selection text-mutation command.
 */
export function resolveQuireSelectionTextMutationCommandRoute(
  scope: QuireCommandRoutingScope
): QuireSelectionCommandRoute {
  return resolveQuireSelectionCommandRoute({ scope, intent: "text-mutation" });
}

/**
 * Resolves a selection-domain command route for keydown text-editing commands.
 *
 * @param scope - Active command routing scope.
 * @param event - Keyboard event that may request a text edit.
 * @returns Routed selection text-mutation command, or null for non-editing keys.
 */
export function resolveQuireSelectionTextEditingCommandRoute(
  scope: QuireCommandRoutingScope,
  event: QuireKeyboardInputEvent
): QuireSelectionCommandRoute | null {
  if (!isQuireTextEditingKey(event)) {
    return null;
  }

  return resolveQuireSelectionTextMutationCommandRoute(scope);
}

/**
 * Resolves a generic edit route for keydown commands that can mutate document text.
 *
 * @param scope - Active command routing scope.
 * @param event - Keyboard event that may request a text edit.
 * @param selectionRoute - Pre-resolved selection route for the same scope.
 * @returns Routed generic edit command, or null when the key is not a text edit.
 */
export function resolveQuireGenericTextEditingCommandRoute(
  scope: QuireCommandRoutingScope,
  event: QuireKeyboardInputEvent,
  selectionRoute?: QuireSelectionCommandRoute
): QuireGenericEditCommandRoute | null {
  if (!isQuireTextEditingKey(event)) {
    return null;
  }

  return resolveQuireGenericTextMutationCommandRoute(scope, selectionRoute);
}

/**
 * Resolves the generic edit route for text mutation commands.
 *
 * @param scope - Active command routing scope.
 * @param selectionRoute - Pre-resolved selection route for the same scope.
 * @returns Routed generic edit command for text mutation.
 */
export function resolveQuireGenericTextMutationCommandRoute(
  scope: QuireCommandRoutingScope,
  selectionRoute?: QuireSelectionCommandRoute
): QuireGenericEditCommandRoute {
  return resolveQuireGenericEditCommandRoute({
    scope,
    selectionRoute,
    intent: "text-mutation"
  });
}

/**
 * Resolves the blocked generic text-mutation route for input dispatch.
 *
 * @param scope - Active command routing scope.
 * @param selectionRoute - Pre-resolved selection route for the same scope.
 * @returns Blocked generic edit route, or null when text mutation may continue.
 */
export function resolveQuireBlockedGenericTextMutationCommandRoute(
  scope: QuireCommandRoutingScope,
  selectionRoute?: QuireSelectionCommandRoute
): QuireGenericEditCommandRoute | null {
  const route = resolveQuireGenericTextMutationCommandRoute(scope, selectionRoute);

  return route.kind === "block" ? route : null;
}

/**
 * Resolves the generic edit route for cut commands.
 *
 * @param scope - Active command routing scope.
 * @param selectionRoute - Pre-resolved selection route for the same scope.
 * @returns Routed generic edit command for cut.
 */
export function resolveQuireGenericCutCommandRoute(
  scope: QuireCommandRoutingScope,
  selectionRoute?: QuireSelectionCommandRoute
): QuireGenericEditCommandRoute {
  return resolveQuireGenericEditCommandRoute({
    scope,
    selectionRoute,
    intent: "cut"
  });
}

/**
 * Resolves the blocked generic cut route for clipboard dispatch.
 *
 * @param scope - Active command routing scope.
 * @param selectionRoute - Pre-resolved selection route for the same scope.
 * @returns Blocked generic edit route, or null when cut may continue.
 */
export function resolveQuireBlockedGenericCutCommandRoute(
  scope: QuireCommandRoutingScope,
  selectionRoute?: QuireSelectionCommandRoute
): QuireGenericEditCommandRoute | null {
  const route = resolveQuireGenericCutCommandRoute(scope, selectionRoute);

  return route.kind === "block" ? route : null;
}

/**
 * Resolves the generic edit route for paste commands.
 *
 * @param scope - Active command routing scope.
 * @param selectionRoute - Pre-resolved selection route for the same scope.
 * @returns Routed generic edit command for paste.
 */
export function resolveQuireGenericPasteCommandRoute(
  scope: QuireCommandRoutingScope,
  selectionRoute?: QuireSelectionCommandRoute
): QuireGenericEditCommandRoute {
  return resolveQuireGenericEditCommandRoute({
    scope,
    selectionRoute,
    intent: "paste"
  });
}

/**
 * Resolves the blocked generic paste route for clipboard dispatch.
 *
 * @param scope - Active command routing scope.
 * @param selectionRoute - Pre-resolved selection route for the same scope.
 * @returns Blocked generic edit route, or null when paste may continue.
 */
export function resolveQuireBlockedGenericPasteCommandRoute(
  scope: QuireCommandRoutingScope,
  selectionRoute?: QuireSelectionCommandRoute
): QuireGenericEditCommandRoute | null {
  const route = resolveQuireGenericPasteCommandRoute(scope, selectionRoute);

  return route.kind === "block" ? route : null;
}

/**
 * Checks whether a keydown event requests generic text editing.
 *
 * @param event - Keyboard event to inspect.
 * @returns Whether PM text keymaps or browser text input would edit document text.
 */
function isQuireTextEditingKey(event: QuireKeyboardInputEvent): boolean {
  switch (event.key) {
    case "Backspace":
    case "Delete":
    case "Enter":
      return true;
    default:
      return isQuirePrintableTextKey(event);
  }
}

/**
 * Checks whether a keydown event represents printable text input.
 *
 * @param event - Keyboard event to inspect.
 * @returns Whether the key is plain printable text without command modifiers.
 */
function isQuirePrintableTextKey(event: QuireKeyboardInputEvent): boolean {
  return event.key.length === 1
    && event.altKey !== true
    && event.ctrlKey !== true
    && event.metaKey !== true;
}

/**
 * Checks whether a key requests deletion of the active selection.
 *
 * @param event - Keyboard event-like object.
 * @returns Whether the key should delete the active selection.
 */
function isQuireDeleteSelectionKey(event: QuireKeyboardInputEvent): boolean {
  return event.key === "Backspace" || event.key === "Delete";
}
