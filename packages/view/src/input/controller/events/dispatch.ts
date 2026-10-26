import type { QuireMountedEditorView } from "@quirekit/core";
import type { EditorProps as PMEditorProps, EditorView } from "@quirekit/pm";

/** Map of DOM event handlers contributed through ProseMirror props. */
type QuirePluginDOMEventHandlers = NonNullable<PMEditorProps["handleDOMEvents"]>;

/**
 * Runs ProseMirror-style DOM event handlers for an editor input event.
 *
 * @param view - Mounted editor view receiving the event.
 * @param event - DOM event to route through direct and plugin props.
 * @param handlerView - PM-style view object passed to event handlers.
 * @returns Whether a handler reported that it handled the event.
 */
export function dispatchQuirePluginDomEvent(
  view: QuireMountedEditorView,
  event: Event,
  handlerView: EditorView = view
): boolean {
  return (
    view.someProp("handleDOMEvents", (handlers) =>
      runQuirePluginDomEventHandler(handlerView, handlers, event)
    ) === true
  );
}

/**
 * Runs one event handler map against the event type.
 *
 * @param view - Mounted editor view receiving the event.
 * @param handlers - ProseMirror `handleDOMEvents` handler map.
 * @param event - DOM event to handle.
 * @returns Whether the handler map consumed the event.
 */
function runQuirePluginDomEventHandler(
  view: EditorView,
  handlers: QuirePluginDOMEventHandlers,
  event: Event
): boolean {
  const handler = handlers[event.type];

  if (handler === undefined) {
    return false;
  }

  return handler(view, event) === true || event.defaultPrevented;
}
