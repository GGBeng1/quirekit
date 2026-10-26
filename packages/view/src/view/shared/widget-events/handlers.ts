import type {
  QuireExtensionViewEventContext,
  QuireExtensionViewEventHandlerMap
} from "@quirekit/core";
import type { QuireViewScope } from "@quirekit/renderer";

/** Options used to register extension event handlers on a mounted qkView scope. */
export interface MountedWidgetViewEventHandlerRegistrationOptions {
  /** Mounted qkView scope that owns the named handlers. */
  readonly scope: QuireViewScope<unknown>;
  /** Extension-contributed handlers keyed by stable handler id. */
  readonly eventHandlers: QuireExtensionViewEventHandlerMap;
  /**
   * Reads the editor/view event context at dispatch time.
   *
   * @returns Context for the mounted view that is currently dispatching.
   */
  readonly getContext: () => QuireExtensionViewEventContext;
}

/**
 * Registers extension-owned event handlers on a mounted view scope.
 *
 * @param options - Mounted scope, event-handler map, and context getter.
 * @returns Cleanup function that unregisters the mounted event handlers.
 */
export function registerMountedWidgetViewEventHandlers(
  options: MountedWidgetViewEventHandlerRegistrationOptions
): () => void {
  const removeHandlers: Array<() => void> = [];

  for (const [handlerId, handler] of Object.entries(options.eventHandlers)) {
    removeHandlers.push(options.scope.registerEventHandler(handlerId, (event) =>
      handler(options.getContext(), event)
    ));
  }

  return () => {
    for (const removeHandler of removeHandlers.splice(0).reverse()) {
      removeHandler();
    }
  };
}
