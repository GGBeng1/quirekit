import type { QuireEditor } from "@quirekit/core";
import type { EditorView } from "@quirekit/pm";
import type {
  QuireBeforeInputEvent,
  QuireCompositionInputEvent,
  QuireKeyboardInputEvent
} from "../../types";
import { dispatchQuirePluginDomEvent } from "./dispatch";
import {
  createBeforeInputEvent,
  createCompositionEvent,
  createKeyboardEvent
} from "./dom";

/** Shared context used when dispatching PM-compatible input plugin events. */
export interface QuireInputPluginEventContext {
  /** Editor whose plugin props should receive events. */
  readonly editor: QuireEditor;
  /**
   * Creates the PM-like view passed to plugin handlers.
   *
   * @returns PM-compatible view bridge.
   */
  readonly createEditorView: () => EditorView;
}

/**
 * Calls ProseMirror text input props for installed plugins.
 *
 * @param context - Editor and view bridge factory.
 * @param from - Start document position.
 * @param to - End document position.
 * @param text - Text that should be inserted.
 * @returns Whether a plugin handled the text.
 */
export function dispatchQuireTextInputProps(
  context: QuireInputPluginEventContext,
  from: number,
  to: number,
  text: string
): boolean {
  const view = context.createEditorView();

  return (
    context.editor.view.someProp("handleTextInput", (handler) =>
      handler(view, from, to, text)
    ) === true
  );
}

/**
 * Calls ProseMirror beforeinput DOM event props for installed plugins.
 *
 * @param context - Editor and view bridge factory.
 * @param event - DOM-light beforeinput event.
 * @returns Whether a plugin handled the event.
 */
export function dispatchQuireBeforeInputProps(
  context: QuireInputPluginEventContext,
  event: QuireBeforeInputEvent
): boolean {
  return dispatchQuirePluginDomEvent(
    context.editor.view,
    createBeforeInputEvent(event),
    context.createEditorView()
  );
}

/**
 * Calls ProseMirror keydown props for installed plugins.
 *
 * @param context - Editor and view bridge factory.
 * @param event - DOM-light keyboard event.
 * @returns Whether a plugin handled the key.
 */
export function dispatchQuireKeyDownProps(
  context: QuireInputPluginEventContext,
  event: QuireKeyboardInputEvent
): boolean {
  const view = context.createEditorView();
  const keyboardEvent = createKeyboardEvent(event);

  return (
    context.editor.view.someProp("handleKeyDown", (handler) =>
      handler(view, keyboardEvent)
    ) === true
  );
}

/**
 * Calls PM-style composition DOM event handlers contributed by plugins.
 *
 * @param context - Editor and view bridge factory.
 * @param type - Composition event type to dispatch.
 * @param event - DOM-light composition event payload.
 * @param composing - Whether the synthetic view is currently composing.
 * @returns Whether any plugin handled the composition event.
 */
export function dispatchQuireCompositionDomEvent(
  context: QuireInputPluginEventContext,
  type: "compositionstart" | "compositionupdate" | "compositionend",
  event: QuireCompositionInputEvent | undefined,
  composing: boolean
): boolean {
  return dispatchQuirePluginDomEvent(
    context.editor.view,
    createCompositionEvent(type, event, composing),
    context.createEditorView()
  );
}
